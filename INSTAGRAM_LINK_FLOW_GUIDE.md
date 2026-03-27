# Instagram Link Flow Guide

Tai lieu nay mo ta luong Link Instagram dang duoc su dung trong app LiveTracker, theo dung implementation hien tai tren mobile va backend.

## 1. Muc tieu

- Cho phep user lien ket tai khoan Instagram vao app.
- Sau khi lien ket thanh cong, backend luu token va xu ly webhook de nhan du lieu live comments.

## 2. Thanh phan tham gia

- Mobile app:
  - src/screens/ProfileScreen/ProfileScreen.tsx
  - src/hooks/useInstagramAuth.ts
- Backend API:
  - POST /api/v1/instagram-auth/exchange-token
  - POST /api/v1/instagram-auth/register-webhook
  - POST /api/v1/instagram/webhook
- Meta Instagram Basic Display app.

## 3. Cau hinh dang dung trong code

- Instagram App ID: 1494270874967671
- Redirect URI: https://livetracker-ulz2.onrender.com/ul
- OAuth authorize endpoint: https://api.instagram.com/oauth/authorize
- OAuth token exchange endpoint: https://api.instagram.com/oauth/access_token

Luu y: Redirect URI trong Meta Developers phai khop chinh xac voi Redirect URI tren. Neu khong se gap loi redirect_uri mismatch.

## 4. Flow chi tiet

### Buoc 1: User bat dau link Instagram

- User vao Profile.
- User nhan nut Xac thuc Instagram.
- App goi ham handleAuthenticateInstagram.

### Buoc 2: App mo OAuth URL

- App build authorize URL voi cac tham so:
  - client_id
  - redirect_uri
  - scope
  - response_type=code
- App mo trinh duyet qua Linking.openURL(authUrl).

### Buoc 3: Instagram redirect ve redirect URI

- Sau khi user dang nhap va dong y quyen, Instagram redirect ve:
  - https://livetracker-ulz2.onrender.com/ul?code=...
- App lang nghe deep link trong ProfileScreen va lay authorization code.

### Buoc 4: Mobile doi code lay short-lived token

- App goi exchangeCodeForToken(code) trong useInstagramAuth.
- Request den https://api.instagram.com/oauth/access_token voi:
  - client_id
  - client_secret
  - grant_type=authorization_code
  - redirect_uri
  - code
- Ket qua nhan duoc:
  - access_token (short-lived)
  - user_id

### Buoc 5: Mobile gui short-lived token len backend

- App goi POST /api/v1/instagram-auth/exchange-token.
- Body gui len:
  - shortLivedToken
- Backend tiep tuc xu ly exchange token, luu lien ket Instagram va thong tin can thiet.

### Buoc 6: Hoan tat lien ket

- Neu thanh cong, app refresh lai danh sach shops.
- Hien thong bao lien ket Instagram thanh cong.

## 5. Sequence ngan gon

1. User nhan Xac thuc Instagram
2. Mobile mo Instagram OAuth authorize URL
3. Instagram tra ve redirect URI kem code
4. Mobile doi code lay short-lived token
5. Mobile goi backend exchange-token
6. Backend luu lien ket va cau hinh webhook
7. Mobile refresh data va thong bao thanh cong

## 6. Yeu cau setup Meta Developers

Can dam bao da cau hinh day du trong Meta Developers:

- Valid OAuth Redirect URI: https://livetracker-ulz2.onrender.com/ul
- Instagram tester account da duoc add va accept invite
- App ID va App Secret khop voi cau hinh dang dung

Neu thieu mot trong cac dieu kien tren, flow link co the that bai o buoc OAuth hoac token exchange.

## 7. Loi thuong gap va cach xu ly

### redirect_uri mismatch

- Nguyen nhan: Redirect URI tren Meta khong trung voi URI app dang gui.
- Cach xu ly: set lai dung https://livetracker-ulz2.onrender.com/ul.

### User is not authorized

- Nguyen nhan: account chua la Instagram tester hoac chua accept invite.
- Cach xu ly: add tester va accept invite trong Instagram app.

### Failed to exchange code for token

- Nguyen nhan:
  - code het han
  - redirect_uri/client_secret sai
  - loi mang
- Cach xu ly:
  - dang nhap lai de lay code moi
  - kiem tra App Secret va Redirect URI
  - kiem tra ket noi internet

## 8. Diem can nhat quan trong tai lieu

Hien tai trong repo co mot so tai lieu cu dung Redirect URI khac. Khi update tai lieu hoac setup moi, uu tien dung Redirect URI dang duoc implementation su dung:

- https://livetracker-ulz2.onrender.com/ul

## 9. Tai lieu lien quan

- INSTAGRAM_AUTH_SETUP.md
- INSTAGRAM_AUTH_CHECKLIST.md
- LIVES_API_DOCS.md (muc Instagram Webhook)
- src/screens/ProfileScreen/ProfileScreen.tsx
- src/hooks/useInstagramAuth.ts
