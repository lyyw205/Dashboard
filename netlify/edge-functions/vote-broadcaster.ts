// 파일 경로: netlify/edge-functions/vote-broadcaster.ts

import type { Context } from "@netlify/functions";

// 서버에 연결된 모든 클라이언트(웹소켓)를 저장하는 맵
const server = new Map<string, WebSocket>();
// 메모리에 번호별 득표수를 저장하는 맵 (DB 대신 사용)
let voteCounts = new Map<number, number>();

export default async (request: Request, context: Context) => {
  const { pathname } = new URL(request.url);

  // --- 1. WebSocket 연결 요청 처리 ---
  // 시각화 페이지(vote.html)가 'wss://.../ws'로 연결을 시도하면 이 부분이 실행됩니다.
  if (pathname.startsWith("/ws")) {
    const { response, socket } = Deno.upgradeWebSocket(request);

    // 연결이 성공적으로 열렸을 때
    socket.onopen = () => {
      const socketId = crypto.randomUUID();
      server.set(socketId, socket);
      console.log(`[Socket] 클라이언트 연결 성공: ${socketId}`);

      // 새로 연결된 클라이언트에게 현재까지의 투표 현황을 즉시 보내줍니다.
      // (예: 새로고침해도 이전 투표 결과가 보이도록)
      socket.send(JSON.stringify({ type: 'initial_state', data: Object.fromEntries(voteCounts) }));
    };

    // 연결이 닫혔을 때 (브라우저를 닫는 등)
    socket.onclose = () => {
      for (const [id, s] of server.entries()) {
        if (s === socket) {
          server.delete(id);
          console.log(`[Socket] 클라이언트 연결 끊김: ${id}`);
          break;
        }
      }
    };

    return response;
  }

  // --- 2. Tally.so Webhook 요청 처리 ---
  // Tally.so 폼이 제출되면 'https://.../tally-hook'로 POST 요청을 보내고, 이 부분이 실행됩니다.
  if (pathname.startsWith("/tally-hook") && request.method === 'POST') {
    try {
      const payload = await request.json();
      // Tally.so 폼의 첫 번째 Number 필드 값을 가져옵니다.
      const votedNumber = payload.data.fields[0].value as number;

      if (typeof votedNumber !== 'number') {
        return new Response("유효하지 않은 번호입니다.", { status: 400 });
      }

      // 메모리에 저장된 득표수를 1 증가시킵니다.
      const currentVotes = voteCounts.get(votedNumber) || 0;
      voteCounts.set(votedNumber, currentVotes + 1);

      console.log(`[Webhook] '${votedNumber}'번 투표 접수. 현재 득표수: ${voteCounts.get(votedNumber)}`);

      // 연결된 모든 클라이언트(시각화 페이지)에게 이 소식을 방송(브로드캐스트)합니다.
      for (const socket of server.values()) {
        socket.send(JSON.stringify({ type: 'new_vote', data: { number: votedNumber, votes: voteCounts.get(votedNumber) } }));
      }

      return new Response("웹훅 처리 및 방송 완료.", { status: 200 });

    } catch (error) {
      console.error("[Webhook] 에러:", error);
      return new Response("웹훅 처리 중 에러 발생.", { status: 500 });
    }
  }

  // --- 3. 투표 리셋 요청 처리 ---
  // 관리자가 'https://.../reset'으로 POST 요청을 보내면, 이 부분이 실행됩니다.
  if (pathname.startsWith("/reset") && request.method === 'POST') {
    voteCounts.clear(); // 메모리의 모든 투표 기록을 삭제합니다.
    console.log("[Reset] 모든 투표가 초기화되었습니다.");

    // 연결된 모든 클라이언트에게 "리셋" 소식을 방송합니다.
    for (const socket of server.values()) {
        socket.send(JSON.stringify({ type: 'reset' }));
    }
    return new Response("투표가 성공적으로 초기화되었습니다.", { status: 200 });
  }

  // 위 세 가지 경우에 해당하지 않는 요청은 그냥 통과시킵니다.
  return new Response("해당 경로를 찾을 수 없습니다.", { status: 404 });
};