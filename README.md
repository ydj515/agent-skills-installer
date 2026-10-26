# agent-skills-installer

[![CI](https://github.com/ydj515/agent-skills-installer/actions/workflows/ci.yml/badge.svg)](https://github.com/ydj515/agent-skills-installer/actions/workflows/ci.yml)
[![Release Publish Package](https://github.com/ydj515/agent-skills-installer/actions/workflows/release-publish.yml/badge.svg)](https://github.com/ydj515/agent-skills-installer/actions/workflows/release-publish.yml)
[![npm version](https://img.shields.io/npm/v/agent-skills-installer.svg?logo=npm)](https://www.npmjs.com/package/agent-skills-installer)
[![Node.js](https://img.shields.io/badge/Node.js-24.19.0%20(%3E%3D20.0.0)-339933?logo=nodedotjs&logoColor=white)](./mise.toml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Codex, Claude Code, Gemini CLI를 위한 번들 Agent Skills를 단일 `npx` 진입점으로 설치·관리하는 npm CLI입니다.
하나의 공통 스킬 소스 트리(`skills/<skill-id>/`)를 에이전트별 지원 디렉터리 레이아웃에 맞게 필터링하여 사용자(`user`) 또는 프로젝트(`project`) 범위에 설치합니다.
소유권 마커(`.agent-skills-installer.json`), 잠금 파일, 임시 스테이징 복사 방식으로 기존 비관리 디렉터리의 덮어쓰기를 방지합니다.

**기술 스택:** Node.js (ESM, `>=20.0.0`) · npm CLI · node:test · mise · GitHub Actions

## 주요 기능

- **멀티 에이전트 레이아웃 변환:** 동일한 패키징 스킬을 Codex, Claude Code, Gemini CLI의 각 스킬 디렉터리 규칙에 맞춰 자동 변환 및 설치
- **대화형 위저드와 필터 CLI:** 검색·그룹·태그 필터를 지원하는 터미널 위저드와 `--skills`, `--tag`, `--group`, `--dry-run` 기반의 직접 명령 지원
- **안전한 파일 프로비저닝:** 소유권 마커 검증, 동시 실행 잠금(Lock), 원자적 임시 디렉터리 교체로 안전한 설치·업데이트·삭제 보장

## 번들 스킬

[`catalog.json`](./catalog.json)에 포함된 주요 스킬 구성입니다.

- **코드 리뷰·협업:** `gh-address-comments`, `gh-fix-ci`, `gitlab-mr-review`, `trello`, `hiring-analyzer`
- **웹·UI·다이어그램:** `playwright`, `a11y-audit-guide`, `a11y-fix-guide`, `modern-minimal-ui`, `architecture-diagram`
- **문서 자동화:** `doc` (DOCX), `pdf` (PDF)
- **mise 워크플로우:** `mise-env`, `mise-policy`, `mise-profiles`, `mise-review`, `mise-tasks`, `mise-tools`, `mise-lock`, `mise-ci`

## 요구 사항

- **CLI 실행:** Node.js `>=20.0.0` (macOS, Linux 지원)
- **로컬 개발:** [mise](https://mise.jdx.dev/) — 개발용 Node.js 버전(`24.19.0`)은 [`mise.toml`](./mise.toml)에 고정되어 있으며 `mise`가 설치합니다.

## 빠른 시작

### `npx`로 바로 사용하기

```bash
# 대화형 설치 위저드 실행
npx agent-skills-installer

# 타깃 및 스킬 지정 설치
npx agent-skills-installer install codex
npx agent-skills-installer install all --scope project
npx agent-skills-installer install codex --skills playwright,trello
npx agent-skills-installer install all --scope project --dry-run

# 설치 목록 확인, 업데이트, 제거
npx agent-skills-installer list all
npx agent-skills-installer update all
npx agent-skills-installer remove codex --skills playwright
```

### 로컬 개발 환경 실행

```bash
mise trust       # 최초 1회, mise.toml 검토 후 신뢰
mise install     # 고정된 Node.js(24.19.0) 설치
mise run verify  # 테스트 + 패키지 번들 검증 + npx 스모크 테스트
```

타깃별 스킬 디렉터리 구조, 설치 경로, 잠금·충돌 처리 정책, 배포 절차는 [상세 가이드](./docs/GUIDE.md)에 설명합니다.

## 주요 명령

| 명령 | 설명 |
| --- | --- |
| `mise run start` | 로컬 CLI 실행 (`node src/cli.js`) |
| `mise run test` | 자동화 테스트 스위트 실행 (`npm test`) |
| `mise run test-matrix` | CI 지원 런타임(Node 20, 22, 24) 전체 테스트 실행 |
| `mise run pack` | 배포용 npm 타르볼 구성 검증 (`npm pack --dry-run`) |
| `mise run smoke` | 타르볼 생성 후 격리 환경에서 `npx` 설치 스모크 테스트 |
| `mise run verify` | `test` + `pack` + `smoke` 통합 품질 검증 |

전체 task 목록은 `mise tasks`로 확인할 수 있습니다.

## 문서

- [사용 및 운영 가이드](./docs/GUIDE.md)
- [구현 계획 및 설계 배경](./docs/IMPLEMENTATION_PLAN.md)
- [변경 이력 (CHANGELOG)](./CHANGELOG.md)

## 기여

변경 전 [기여 가이드](./CONTRIBUTING.md)를 확인해 주세요.
