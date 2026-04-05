const fs = require('fs');
const http = require('https');

async function testApi() {
  try {
    const loginData = JSON.stringify({ email: "giorlin@livetracker.vn", password: "Giorlin2026" });
    const loginRes = await fetch("https://admin.livetracker.vn/api/v1/auth/login", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: loginData
    });
    const loginJson = await loginRes.json();
    const token = loginJson.data.accessToken;

    console.log("Token acquired.");
    
    // Get live id
    const liveRes = await fetch("https://admin.livetracker.vn/api/v1/lives/my-lives?limit=1", {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const liveJson = await liveRes.json();
    const liveId = liveJson.data.items[0].id;
    console.log("Live ID:", liveId);
    
    // Fetch comments page 1
    const c1Res = await fetch(`https://admin.livetracker.vn/api/v1/comments/live/${liveId}/cursor?limit=5`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const c1 = await c1Res.json();
    console.log("Page 1 length:", c1.data.items.length);
    console.log("P1 items:");
    c1.data.items.forEach(i => console.log(i.text + " (" + i.createdAt + ")"));
    console.log("P1 pagination:", c1.data.pagination);
    
    const nextCursor = c1.data.pagination.nextCursor;
    const prevCursor = c1.data.pagination.prevCursor;
    
    // Fetch comments page 2 with direction: next
    if (nextCursor) {
        console.log("\nFetching with nextCursor:", nextCursor);
        const c2Res = await fetch(`https://admin.livetracker.vn/api/v1/comments/live/${liveId}/cursor?limit=5&direction=next&cursor=${nextCursor}`, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        const c2 = await c2Res.json();
        console.log("Page 2 (next) length:", c2.data.items.length);
        console.log("P2 items:");
        c2.data.items.forEach(i => console.log(i.text + " (" + i.createdAt + ")"));
        console.log("P2 pagination:", c2.data.pagination);
    }

    // Fetch comments page 2 with direction: prev
    if (prevCursor) {
        console.log("\nFetching with prevCursor:", prevCursor);
        const c3Res = await fetch(`https://admin.livetracker.vn/api/v1/comments/live/${liveId}/cursor?limit=5&direction=prev&cursor=${prevCursor}`, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        const c3 = await c3Res.json();
        console.log("Page 2 (prev) length:", c3.data?.items?.length);
        console.log("P3 items:", c3.data?.items?.map(i => i.text + " (" + i.createdAt + ")"));
    }

  } catch(e) {
    console.log("Error", e);
  }
}
testApi();
