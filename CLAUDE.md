# Buzzer

First-to-buzz app — standalone game tool and embeddable React component.

## Tech Stack
- **Frontend**: React + TypeScript + Vite (hosted on S3 + CloudFront)
- **Backend**: AWS Lambda + TypeScript (7 handlers)
- **API**: API Gateway WebSocket
- **Database**: DynamoDB (single-table design)
- **IaC**: AWS SAM (`template.yaml`)
- **Runtime**: Node.js 20.x

## Project Structure
```
buzzer/
├── CLAUDE.md
├── template.yaml              ← SAM template (all AWS resources)
├── samconfig.toml             ← SAM deploy config
├── backend/
│   ├── src/
│   │   ├── handlers/          ← onConnect, onDisconnect, createRoom, joinRoom,
│   │   │                        buzz, reset, rejoinRoom
│   │   └── shared/            ← types, dynamo, broadcast, roomCode
│   ├── jest.config.ts
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx            ← Standalone app with useReducer state management
│   │   ├── types.ts           ← Shared types (mirrors backend messages)
│   │   ├── hooks/
│   │   │   └── useWebSocket.ts ← WebSocket hook with auto-reconnect
│   │   └── components/        ← Lobby, BuzzerScreen, HostControls, BuzzerPanel
│   ├── vite.config.ts         ← base: '/buzzer/'
│   └── package.json
└── .github/
    └── workflows/
        └── deploy.yml         ← test on PR, deploy on push to main
```

## AWS CLI Access
- **AWS_PROFILE**: `claude-buzzer` (assumes `claude-buzzer-deploy-role`)
- Read-only fallback: `claude-readonly`

## Deployment
- **Frontend URL**: `https://d1gr6jyuq5jzqs.cloudfront.net/buzzer/index.html`
- **WebSocket URL**: TBD (after first deploy)
- **Backend Stack**: `buzzer` (SAM/CloudFormation, ap-southeast-1)
- **CloudFront ID**: E3Q96KPBE6V4X8
- **S3 Bucket**: flip-seven-games-com-wip (frontend served from `/buzzer/`)
- **Domain**: `games.vernon-engle.com/buzzer/`

## CI/CD (GitHub Actions)
- **Workflow**: `.github/workflows/deploy.yml`
- **Auth**: GitHub OIDC federation (no stored secrets)
- **IAM Role**: `github-actions-buzzer-role` (scoped to `main` branch, `production` environment)
- **On PR/push**: `test` job — backend unit tests + frontend type-check/build
- **On push to main**: `deploy` job — SAM build+deploy backend, then build+sync frontend to S3, CloudFront invalidation
- SAM build requires `npm install -g esbuild` in CI

## Development Workflow
```bash
# Install dependencies
cd frontend && npm install
cd backend && npm install

# Run frontend locally
cd frontend && npm run dev

# Run backend tests
cd backend && npm test

# Build and deploy backend
cd buzzer && sam build && AWS_PROFILE=claude-buzzer sam deploy

# Build and deploy frontend
cd frontend && npm run build
AWS_PROFILE=claude-buzzer aws s3 sync dist/ s3://flip-seven-games-com-wip/buzzer/ --delete --cache-control "max-age=300"
AWS_PROFILE=claude-buzzer aws cloudfront create-invalidation --distribution-id E3Q96KPBE6V4X8 --paths "/buzzer/*"
```

## Dual-Use Frontend
1. **Standalone app** — full page at `/buzzer/` with lobby (create/join room), buzzer screen, host controls
2. **Embeddable component** — `BuzzerPanel` component accepts wsUrl, roomCode, playerId, playerName, isHost props

## Serverless Conventions
- One function per route/action
- Shared code in `backend/src/shared/`
- Environment variables for configuration
- DynamoDB single-table design with TTL (24h auto-cleanup)
- SAM template is the source of truth
