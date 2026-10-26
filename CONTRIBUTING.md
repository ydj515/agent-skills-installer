# 기여 가이드

`agent-skills-installer`에 기여해 주셔서 감사합니다. 변경 사항을 제출하기 전에 아래 개발 환경 설정과 검증 절차를 확인해 주세요. 상세한 타깃별 디렉터리 레이아웃과 안전 정책은 [사용 및 운영 가이드](./docs/GUIDE.md)에 정리되어 있습니다.

## 1. 개발 환경 준비

Node.js 버전(`24.19.0`)과 공통 작업은 [`mise.toml`](./mise.toml)에 정의되어 있습니다. 런타임 호환성은 Node.js `20`, `22`, `24`를 지원합니다.

```bash
mise trust
mise install
mise tasks
```

## 2. 코드 및 스킬 번들 작성 규칙

- **스킬 소스 구조:** 각 스킬은 [`skills/<skill-id>/`](./skills) 아래에 `SKILL.md`와 선택적 `scripts/`, `references/`, `assets/`, `agents/`를 포함해 독립적으로 구성합니다. 번들 내 심볼릭 링크(symlink)는 허용되지 않습니다.
- **카탈로그 등록:** 새 스킬을 추가하거나 메타데이터를 변경할 때는 [`catalog.json`](./catalog.json)의 `skills` 항목(`id`, `title`, `description`, `version`, `sourceDir`, `targets`, `tags`, `groups`)을 함께 갱신하세요.
- **커밋 메시지:** `feat:`, `fix:`, `docs:`, `chore:`, `build:`, `test:` 등 Conventional Commits 형식을 따릅니다.

## 3. 필수 검증

모든 변경 사항은 Pull Request를 제출하기 전에 아래 검증 명령을 통과해야 합니다.

```bash
mise run verify
```

Node 버전 호환성이나 패키징에 영향을 주는 변경인 경우 매트릭스 테스트를 함께 실행해 주세요.

```bash
mise run test-matrix
```

## 4. 참고 문서

- [사용 및 운영 가이드](./docs/GUIDE.md)
- [구현 계획 및 설계 배경](./docs/IMPLEMENTATION_PLAN.md)
- [변경 이력 (CHANGELOG)](./CHANGELOG.md)
