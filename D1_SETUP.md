# PIPPI D1 연결

인증 코드는 모두 연결되어 있습니다. 실제 Cloudflare D1에는 아래 순서만 실행하면 됩니다.

1. Cloudflare 로그인

   ```bash
   npx wrangler login
   ```

2. D1 데이터베이스 생성

   ```bash
   npx wrangler d1 create pippi
   ```

3. 출력된 `database_id`를 `wrangler.jsonc`의 `database_id`에 붙여 넣기

4. 원격 데이터베이스에 테이블 생성

   ```bash
   npm run db:migrate:remote
   ```

5. 배포

   ```bash
   npm run cf:deploy
   ```

로컬 D1으로 먼저 시험하려면 다음을 실행합니다.

```bash
npm run db:migrate:local
npm run dev
```

`DB` 바인딩 이름은 코드와 설정에 이미 일치시켜 두었습니다. 별도의 D1 API 키를 앱 코드나 브라우저에 넣지 않습니다. 배포 권한을 위한 Cloudflare 로그인만 필요합니다.

## 구현된 API

- `GET /api/auth/availability?number=1234567`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/session`
- `POST /api/auth/logout`

비밀번호는 사용자별 salt와 PBKDF2-SHA-256(210,000회)으로 저장합니다. 로그인 세션은 30일짜리 HttpOnly, SameSite=Lax 쿠키이며 D1에는 세션 토큰 원문 대신 SHA-256 해시만 저장합니다.
