# 멀티 에이전트 스킬 배포 패키지 구현 계획

## 0. 결정 요약

| 항목 | 결정 |
| --- | --- |
| 공개 패키지명 | `agent-skills-installer` |
| 공개 배포 방식 | npm 공개 배포 |
| 권장 기본 진입점 | `npx agent-skills-installer` |
| v1 직접 명령 | `install <codex|claude|gemini|all>` |
| v1 대화형 설치 | 지원 |
| v1 skill 선택 범위 | 선택한 agent에 대해 패키지에 포함된 초기 2개 초기 스킬만 체크박스로 선택 가능 |
| v2 확장 | `--skills`, `list`, `remove`, `update`, 태그/그룹 |
| `install all` 정책 | 타깃별 원자적 설치 + 전체적으로는 `best-effort` + 최종 non-zero |
| `--force` 정책 | 우리 도구의 소유권 마커가 있는 디렉터리에만 허용 |
| 지원 플랫폼 | v1 공식 지원/검증은 macOS, Linux |

## 1. 문제 이해 / 요구사항 정리

### 조건
- 이 저장소는 현재 비어 있으므로, 새로운 Node 기반 CLI 패키지를 처음부터 설계해야 한다.
- 패키지 이름은 `agent-skills-installer`로 고정한다.
- 패키지는 npm에 공개 배포한다.
- 사용자는 소스 체크아웃 없이 `npx agent-skills-installer`로 실행할 수 있어야 한다.
- 지원 대상은 `Codex`, `Claude Code`, `Gemini CLI`다.
- 세 도구 모두 `SKILL.md` 기반 Agent Skills 표준을 사용하지만, 설치 경로와 일부 메타데이터 규칙은 다르다.
- `user` 설치와 `project` 설치를 모두 지원해야 한다.
- v1은 빠르게 신뢰 가능한 설치기를 만드는 것이 우선이며, v2에서 여러 스킬 관리 기능을 확장한다.

### 목표
- 공통 스킬 원본을 한 번만 작성하고 여러 agent에 설치할 수 있게 만든다.
- 대화형 설치와 비대화형 설치가 동일한 내부 설치 로직을 사용하게 만든다.
- 안전한 재설치와 충돌 방지를 위해 소유권 마커를 사용한다.
- 공개 배포 도구로서 경로 검증, 충돌 방지, 에러 코드, 설치 요약 출력을 명확히 정의한다.

## 2. 해결 접근

### 선택한 접근
- `공통 카탈로그 + 타깃 어댑터` 구조로 시작한다.
- 스킬 원본은 `skills/` 아래에 공통 포맷으로 보관한다.
- 설치 시점에는 타깃별 경로와 오버레이만 다르게 적용한다.
- v1은 “기본 번들 설치 중심”으로 설계하되, 대화형 설치에서는 초기 스킬 2개 범위 안에서 체크박스 선택을 허용한다.
- v2는 같은 카탈로그를 확장해 `--skills`, `list`, `remove`, `update`로 넓힌다.

### 이유
- 공통 스킬을 세 번 관리하지 않아도 되므로 유지보수가 쉽다.
- 각 agent의 설치 경로 차이와 메타데이터 차이만 어댑터로 흡수하면 확장성이 좋다.
- v1에서 안전성과 일관성을 먼저 확보한 뒤, v2에서 선택 기능을 확장하는 것이 리스크가 낮다.

## 3. v1 고정 정책

### 범위
- v1 직접 CLI는 아래만 지원한다.
  - `npx agent-skills-installer`
  - `npx agent-skills-installer install <codex|claude|gemini|all> [--scope user|project] [--cwd <path>] [--dry-run] [--force]`
- v1 대화형 설치는 지원한다.
- v1 대화형 설치의 skill 체크박스는 “선택한 agent에 설치 가능한 초기 2개 초기 스킬”까지만 보여준다.
- v1 직접 CLI에서는 `--skills`를 지원하지 않는다.
- v1에서는 `list`, `remove`, `update`를 지원하지 않는다.

### 직접 CLI와 대화형 설치의 역할
- 직접 CLI:
  - 자동화, 문서 예시, CI 친화적
  - 선택한 agent에서 `enabledByDefault=true`인 초기 스킬만 설치
- 대화형 설치:
  - 첫 사용자 경험 최적화
  - scope와 초기 스킬 선택 제공
  - 기본 체크 기준은 `enabledByDefault=true`

### v1에서 확정하는 운영 정책
- `install all`은 각 타깃을 순차 설치한다.
- 각 타깃 설치는 원자적으로 처리한다.
- 전체 `all` 실행은 `best-effort`로 처리한다.
  - 먼저 성공한 타깃은 유지한다.
  - 이후 타깃이 실패하면 최종 종료 코드는 non-zero다.
- `--force`는 우리 도구가 설치한 디렉터리에만 허용한다.
- 마커 없는 기존 디렉터리는 `--force`여도 덮어쓰지 않는다.
- 인자 없는 실행이 non-TTY 환경이면 대화형 설치로 진입하지 않고 사용법을 출력한 뒤 종료한다.
- user scope 대상 경로가 존재하지만 현재 사용자에게 쓰기 권한이 없으면 설치를 즉시 중단하고, 권한 수정 또는 `project` scope 사용 가이드를 출력한다.

## 4. 아키텍처 개요

### 저장소 구조
- `skills/`
  - 공통 스킬 원본 저장소
  - 각 스킬은 `SKILL.md`, 선택적 `scripts/`, `references/`, `assets/`를 포함한다
- `src/`
  - CLI 엔트리포인트
  - 타깃 어댑터
  - 카탈로그 검증
  - 설치/복사/잠금/요약 출력 로직
- `catalog.json`
  - 설치 대상 스킬, 타깃 지원 범위, 기본 번들 포함 여부를 정의하는 매니페스트
- `docs/`
  - 구현 계획 및 이후 사용 문서

### 핵심 내부 타입
- `TargetAdapter`
  - `resolveInstallRoot(scope, cwd)`
  - `prepareSkill(entry)`
  - `installSkill(entry, root, options)`
- `SkillCatalogEntry`
  - `id`
  - `version`
  - `sourceDir`
  - `targets`
  - `enabledByDefault`
  - 선택 필드: `overlays`
- `InstallSelection`
  - `agent`
  - `requestedSkills`
  - `resolvedSkills`
  - `mode`
- `InstallPlan`
  - `agent`
  - `scope`
  - `installRoot`
  - `skills`
- `OwnershipMarker`
  - `schemaVersion`
  - `packageName`
  - `packageVersion`
  - `skillId`
  - `installedFor`
  - `scope`
  - `installedAt`

## 5. CLI 설계

### 권장 기본 진입점
```bash
npx agent-skills-installer
```

처음 사용하는 사용자는 위 명령으로 대화형 설치를 시작한다.

### v1 직접 CLI
```bash
npx agent-skills-installer install <codex|claude|gemini|all> [--scope user|project] [--cwd <path>] [--dry-run] [--force]
```

### v2 확장 CLI
```bash
npx agent-skills-installer install <codex|claude|gemini> --skills <skill-a,skill-b>
npx agent-skills-installer list <codex|claude|gemini|all>
npx agent-skills-installer remove <codex|claude|gemini> --skills <skill-a,skill-b>
npx agent-skills-installer update <codex|claude|gemini|all> [--skills <skill-a,skill-b>]
```

### 기본 동작
- `npx agent-skills-installer`
  - TTY 환경이면 대화형 설치 시작
  - non-TTY 환경이면 사용법 출력 후 종료
- `install codex`
  - `user`: `CODEX_HOME/skills`가 존재하면 우선 사용, 아니면 `~/.codex/skills` 존재 여부를 확인하고, 둘 다 없으면 `~/.agents/skills`
  - `project`: `<cwd>/.agents/skills`
- `install claude`
  - `user`: `~/.claude/skills`
  - `project`: `<cwd>/.claude/skills`
- `install gemini`
  - `user`: `~/.gemini/skills`
  - `project`: `<cwd>/.gemini/skills`
- `install all`
  - `codex`, `claude`, `gemini` 순으로 실행
  - 각 타깃 성공/실패를 별도로 요약

### 대화형 설치 흐름
1. agent 선택
   - 단일 선택
   - 후보: `codex`, `claude`, `gemini`, `all`
2. scope 선택
   - 단일 선택
   - 후보: `user`, `project`
3. skill 선택
   - 체크박스 다중 선택
   - 기본 체크 기준은 `enabledByDefault=true`
  - v1에서는 초기 스킬 2개만 노출
4. 설치 요약 확인
5. 실제 설치 실행

### 대화형 설치 입력 규칙
- 단일 값 선택은 `select` UI를 사용한다.
- 여러 개 선택은 `checkbox` UI를 사용한다.
- `all`은 개별 agent와 동시에 선택될 수 없으므로 항상 단일 선택 단계에서만 고른다.
- `all`을 고르면 skill 목록을 `codex -> claude -> gemini` 순서의 agent 그룹으로 나눠 보여준다.
- 각 agent 그룹 안에서는 공통 skill을 먼저, agent 전용 skill을 나중에 보여준다.
- 기본 체크 기준은 각 그룹에서 `enabledByDefault=true`인 skill만 자동 선택하는 것이다.
- 대화형 설치에서 선택한 값은 내부적으로 직접 CLI와 동일한 설치 계획 구조로 변환한다.

### 옵션 정책
- `--scope`
  - 기본값은 `user`
- `--cwd`
  - `project` scope일 때 설치 기준 루트
  - 우선순위는 `--cwd` > `process.cwd()`
- `--dry-run`
  - 실제 복사 없이 대상 경로와 스킬 목록만 출력
- `--force`
  - 우리 도구의 마커가 있는 기존 디렉터리에만 허용
- `--skills`
  - v1 미지원
  - v2에서만 지원

### 사용자 피드백 규칙
- 설치 완료 후 항상 아래를 출력한다.
  - 대상 agent
  - 실제 설치 경로
  - 설치된 skill 목록과 개수
  - 건너뛴 항목
  - 실패한 항목
  - 필요 시 “도구를 재시작하면 새 스킬이 보일 수 있음” 안내
- 설치 중 agent가 이미 실행 중일 수 있으므로, 새 스킬이 즉시 보이지 않을 수 있다는 안내를 항상 포함한다.

### 출력 예시
```text
[agent-skills-installer] install summary
- target: codex
- scope: user
- root: /Users/example/.agents/skills
- installed: instruction-only, script-backed
- skipped: none
- failed: none
- note: tool restart may be required to load new skills
```

## 6. 설치 로직 상세

### 공통 설치 흐름
1. CLI 인자와 실행 환경을 파싱한다.
2. 카탈로그를 로드하고 즉시 검증한다.
3. 실행 모드에 따라 설치 계획을 만든다.
4. 타깃별 설치 루트를 계산한다.
5. 타깃 루트 잠금을 획득한다.
6. 선택된 각 스킬에 대해 소스 검증, 스테이징 복사, 원자적 반영을 수행한다.
7. 소유권 마커를 기록한다.
8. 타깃별 결과를 수집한다.
9. 최종 요약과 종료 코드를 반환한다.

### 카탈로그 계약
- top-level 필수 필드
  - `schemaVersion`
  - `skills`
- 각 skill 필수 필드
  - `id`
  - `version`
  - `sourceDir`
  - `targets`
  - `enabledByDefault`
- 검증 규칙
  - 중복 `id` 금지
  - `sourceDir`는 패키지 루트 하위만 허용
  - 절대경로 금지
  - `..` 경로 금지
  - 미지원 target 값 금지
  - 검증 실패 시 즉시 설치 중단

### Codex 경로 결정 정책
- `codex` user scope는 아래 우선순위로 결정한다.
  1. `CODEX_HOME` 환경 변수가 설정되어 있고 `$CODEX_HOME/skills`가 존재하면 그 경로 사용
  2. 아니면 `~/.codex/skills`가 존재하면 그 경로 사용
  3. 둘 다 없으면 `~/.agents/skills` 사용
- 위 경로가 생성 불가 또는 쓰기 불가면 설치를 중단하고 가이드를 출력한다.
- v1에서는 임의의 추가 호환 경로를 자동 탐색하지 않는다.

### 카탈로그 예시
```json
{
  "schemaVersion": 1,
  "skills": [
    {
      "id": "instruction-only",
      "version": "1.0.0",
      "sourceDir": "skills/instruction-only",
      "targets": ["codex", "claude", "gemini"],
      "enabledByDefault": true
    },
    {
      "id": "script-backed",
      "version": "1.0.0",
      "sourceDir": "skills/script-backed",
      "targets": ["codex", "gemini"],
      "enabledByDefault": true
    }
  ]
}
```

### 소유권 마커 정책
- 마커 파일명은 `.agent-skills-installer.json`으로 고정한다.
- 위치는 각 설치된 skill 디렉터리 루트다.
- 기록 필드
  - `schemaVersion`
  - `packageName`
  - `packageVersion`
  - `skillId`
  - `installedFor`
  - `scope`
  - `installedAt`
- 기존 디렉터리에 마커가 없으면 충돌로 간주하고 실패한다.
- `--force`는 아래 두 조건을 모두 만족할 때만 허용한다.
  - 마커 파일이 존재한다
  - `packageName`이 `agent-skills-installer`다
- `--force` 적용 전 마커 필드 검증을 추가로 수행한다.
  - `schemaVersion`이 지원 버전이어야 한다
  - `skillId`가 현재 대상 스킬과 일치해야 한다
  - `installedFor`와 `scope`가 현재 설치 요청과 일치해야 한다
- 마커 파일이 손상되었거나 필수 필드가 없으면 자동 복구하지 않고 실패 처리한다.
- 마커 손상 메시지 템플릿 예시:
```text
[agent-skills-installer] MARKER_INVALID: The ownership marker in "/Users/example/.gemini/skills/script-backed" is missing or corrupted.
This directory cannot be safely overwritten.
Remove the directory manually and reinstall, or choose a different install location.
```
- 사용자가 수동으로 복사하거나 이동한 스킬 디렉터리는 관리 대상이 아닌 외부 디렉터리로 간주한다.
- 외부 디렉터리를 다시 관리 대상으로 편입하려면, 기존 디렉터리를 정리한 뒤 본 도구로 재설치해야 한다.

### 경로 보안 경계
- `catalog.sourceDir`는 패키지 루트 밖으로 나갈 수 없다.
- symlink를 따라가며 경로가 패키지 루트 밖으로 나가는 경우 실패한다.
- v1에서는 skill 소스 내부 symlink를 지원하지 않고, 발견 시 실패한다.
- 일반 파일은 권한 비트를 보존해 복사한다.

### 잠금 / 원자성 정책
- 각 설치 루트에 `.agent-skills-installer.lock` 잠금 파일을 생성해 동시 실행을 막는다.
- 잠금 생성은 원자적 방식(`O_EXCL`)으로 처리한다.
- 잠금 파일에는 `pid`와 `startedAt`을 기록한다.
- 비정상 종료로 남은 stale lock은 아래 조건에서만 회수한다.
  - lock 파일의 `pid`가 더 이상 살아 있지 않다
  - `startedAt` 기준 10분 이상 경과했다
  - lock 메타데이터가 파싱 가능하고 필수 필드가 모두 존재한다
- lock 메타데이터가 손상되었거나 필수 필드가 없으면 자동 회수하지 않고 실패 + 수동 정리 가이드를 출력한다.
- 각 skill 설치용 temp 디렉터리는 반드시 대상 install root 하위의 `.agent-skills-installer-tmp/` 아래에 생성한다.
- temp 디렉터리 이름에는 `pid`, `startedAt`, `skillId`를 포함한다.
- 새 실행이 잠금을 획득한 직후 `.agent-skills-installer-tmp/` 아래의 stale temp 디렉터리를 먼저 정리한다.
  - 동일 install root에 유효한 lock 파일이 없고
  - 기록된 `pid`가 살아 있지 않으며
  - 생성 시각이 10분 이상 지난 temp만 정리한다
  - 디렉터리명이 도구 패턴(`tmp-`)과 일치하고 내부 메타 파일이 존재하는 temp만 정리한다
  - symlink로 확인되는 항목은 자동 정리 대상에서 제외하고 실패 처리한다
- 각 skill 설치는 `temp dir -> validate -> rename` 순서로 처리한다.
- 동일 스킬 디렉터리는 부분 복사 상태로 남기지 않는다.

### 실패 정책
- 단일 타깃 설치:
  - 스킬 단위는 원자적으로 반영한다
  - 해당 타깃에서 실패가 발생하면 그 타깃 설치는 실패로 종료한다
- 프로세스 강제 종료나 예외로 temp 디렉터리가 남더라도, 다음 실행에서 stale temp 정리 규칙으로 회수한다.
- `install all`:
  - 타깃 단위로 순차 실행한다
  - 이미 성공한 이전 타깃은 롤백하지 않는다
  - 최종 결과는 `best-effort + 상세 리포트 + non-zero exit`

### non-TTY 정책
- 인자 없음 + TTY
  - 대화형 설치 실행
- 인자 없음 + non-TTY
  - 사용법 출력
  - 종료 코드 `2`
- 명시적 `install ...` + non-TTY
  - 정상 실행

### 오류 코드 계약
- `0`
  - 완전 성공
- `1`
  - 설치 중 일부 또는 전체 작업 실패
- `2`
  - 사용자 입력/사용법 오류
- `3`
  - 환경/권한/설정 오류
- `4`
  - 충돌/잠금/안전 정책 위반

### lock 충돌 메시지 템플릿 예시
```text
[agent-skills-installer] LOCK_CONFLICT: Another installation is already running for "/Users/example/.gemini/skills".
Wait for the other process to finish and try again.
If you believe the lock is stale, remove it only after confirming that no installer process is still running.
```

### non-TTY 실행 메시지 템플릿 예시
```text
[agent-skills-installer] USAGE_ERROR: Interactive mode requires a TTY.
Run `npx agent-skills-installer install <codex|claude|gemini|all> --scope user|project` in non-interactive environments.
```

### 권한 오류 처리 정책
- user scope 설치 대상 루트가 root 소유 또는 현재 사용자 비가용 권한 상태면 `EACCES`로 처리한다.
- 이 경우 종료 코드 `3`을 사용한다.
- 오류 메시지에는 최소한 아래를 포함한다.
  - 실패한 경로
  - 현재 사용자로 쓰기 불가하다는 설명
  - 권한 수정 또는 `--scope project` 재시도 안내
- 영어 메시지 템플릿 예시:
```text
[agent-skills-installer] EACCES: Cannot write to "/Users/example/.gemini/skills".
The current user does not have permission to modify this directory.
Run `sudo chown -R "$USER" "/Users/example/.gemini"` and try again, or use `--scope project`.
```
- root 소유 디렉터리 안내 예시:
```text
[agent-skills-installer] EACCES: The directory "/Users/example/.gemini/skills" is not writable by the current user.
This usually happens when the directory was created by another user or by root.
Fix the ownership or permissions for "/Users/example/.gemini", then retry, or install with `--scope project`.
```

## 7. 초기 카탈로그 범위

### v1 초기 스킬
- `instruction-only`
  - 순수 문서형 스킬
  - 공통 메타데이터 품질 검증용
- `script-backed`
  - `scripts/` 포함 스킬
  - 자산 복사와 실행 가능 파일 처리 검증용

### v1에서 이 두 개만 두는 이유
- 설치기의 안정성을 빠르게 검증할 수 있다.
- 대화형 설치와 직접 CLI를 같은 카탈로그로 검증하기 쉽다.
- v2 기능보다 설치기 품질을 먼저 다듬을 수 있다.

### v2 확장 방향
- 더 많은 skill을 `catalog.json`에 추가한다.
- `enabledByDefault=false` skill을 늘려 선택 설치 범위를 넓힌다.
- `tags`, `groups`, `hidden`, `deprecated` 같은 필드를 선택적으로 추가한다.

## 8. 테스트 전략

### 단위 테스트
- agent별 설치 경로 계산
- `catalog.json` 스키마 검증
- 중복 `id` 감지
- `--force` 정책 검증
- 종료 코드 결정
- non-TTY 동작 검증

### 통합 테스트
- 임시 HOME 기준 `user` 설치
- 임시 workspace 기준 `project` 설치
- 대화형 설치 흐름 검증
  - agent 단일 선택
  - scope 단일 선택
  - skill 체크박스 선택
  - 요약 확인 후 설치
- 마커 없는 기존 디렉터리 충돌
- 마커 있는 디렉터리 재설치
- 마커 손상/필수 필드 누락 시 `--force` 실패 검증
- `install all` 부분 성공/부분 실패 요약
- 잠금 충돌
- lock 메타데이터 손상 시 자동 회수 금지 검증
- 권한 거부(`EACCES`) 처리
- root 소유 또는 비쓰기 가능 디렉터리 경로 처리
- 중단 후 불완전 디렉터리 미남김 검증
- stale temp 디렉터리 자동 정리 검증

### 패키징 검증
- `npm pack` 산출물에 `skills/`, `catalog.json`, CLI 실행 파일이 포함되는지 검증
- packed tarball 기준 `npx` 설치 스모크 테스트
- `bin` 엔트리와 실제 명령 실행 경로 검증

## 9. 문서 / CI / 배포 계획

### README에 포함할 항목
- 지원 agent
- 첫 실행 권장 명령
- 직접 설치 명령 예시
- 대화형 설치 예시
- 설치 경로
- 충돌 정책
- 이미 설치된 경우의 동작
- 설치 완료 후 기대 결과
- 공개 npm 패키지명
- v2 로드맵 요약

### CI
- Node 버전별 테스트 실행
- `npm test`
- `npm pack`
- packed tarball 스모크 테스트

### 배포 전략
- 1차 공개 패키지명은 `agent-skills-installer`
- publish 직전 확인 항목
  - npm 이름 사용 가능 여부
  - tarball 검증
  - `npx agent-skills-installer` 실행 검증
  - `bin` 엔트리 검증
  - npm 2FA / provenance / dist-tag 정책 확인
- npm 이름이 사용 불가하면 릴리스를 보류하고 이름 재결정을 별도 이슈로 다룬다.
- 초기 릴리스는 `0.x`
- 인터페이스 안정화 후 `1.0.0` 검토

## 10. 복잡도

### 설치기 런타임 복잡도
- 시간 복잡도: `O(A * (S + B))`
  - `A`: 설치 대상 수
  - `S`: 설치 스킬 수
  - `B`: 복사 대상 총 바이트 수
- 공간 복잡도: `O(B)`
  - 설치 결과로 기록되는 총 파일 크기 기준
  - 런타임 메모리는 스트리밍 복사 시 사실상 `O(1)`에 가깝게 관리 가능

### 문서 보강 복잡도
- 시간 복잡도: `O(N)`
  - `N`: 확정해야 하는 정책 수
- 공간 복잡도: `O(1)`

## 11. 주의사항
> - v1과 v2 경계가 다시 섞이면 구현과 테스트 범위가 흔들립니다.
> - `install all`에 대한 cross-target 롤백까지 v1에 넣으면 복잡도가 급격히 올라갑니다.
> - 공개 설치기는 수동 디렉터리 덮어쓰기 사고가 가장 위험하므로 `--force`를 보수적으로 잡아야 합니다.
> - 대화형 설치의 skill 체크박스는 v1 starter skill 범위로 제한해야 범위가 안정됩니다.
> - 설치 가능한 skill 수가 많아지면 v2에서 `groups`와 `tags` 기반 필터링이 필요합니다.
> - 실행 중인 agent 프로세스는 새 스킬을 즉시 인식하지 못할 수 있으므로, 설치 직후 재시작 안내가 필수입니다.
> - 수동으로 이동한 스킬은 소유권 마커 기반 관리 대상에서 제외되므로, 사용자는 “재설치해야 다시 관리된다”는 점을 알아야 합니다.
> - stale lock만 회수해도 temp 잔여물이 남을 수 있으므로, 다음 실행 시 stale temp 자동 정리가 반드시 같이 동작해야 합니다.

## 12. 대안

### 대안 1: 타깃별 완전 분리
- 장점:
  - 타깃 특화 구현이 쉽다
  - 예외 처리가 단순하다
- 단점:
  - 같은 스킬을 세 번 관리해야 한다
  - 유지보수 비용이 크게 증가한다

### 대안 2: Codex와 Gemini를 `.agents/skills` 하나로 완전 통합
- 장점:
  - 공통 표준 활용도가 높다
  - 파일 중복이 줄어든다
- 단점:
  - `install codex`와 `install gemini`의 의미 차이가 흐려진다
  - 사용자 입장에서 설치 결과가 덜 직관적일 수 있다

### 대안 3: 공통 카탈로그 + 타깃 어댑터
- 장점:
  - 유지보수, 확장성, 명확성의 균형이 가장 좋다
  - v1 기본 번들 설치와 v2 확장을 모두 수용하기 좋다
- 단점:
  - 초기 계약과 정책을 더 명확히 적어야 한다

## 13. v2 로드맵
1. `list` 명령 추가
2. `install --skills` 선택 설치 추가
3. `remove --skills` 제거 기능 추가
4. `update` 명령과 선택 업데이트 추가
5. 카탈로그 스키마 확장
6. `groups`, `tags` 기반 필터링 추가
7. 더 큰 카탈로그를 위한 대화형 검색/필터 UX 추가

## 14. 완료 조건(Definition of Done)
- `npx agent-skills-installer`가 TTY에서 대화형 설치를 시작한다
- `install codex|claude|gemini|all`이 문서 경로 규칙대로 동작한다
- `--dry-run`이 설치 대상과 스킬 목록을 정확히 출력한다
- `--force`가 우리 도구가 설치한 디렉터리에만 동작한다
- `install all`이 부분 성공/실패를 요약하고 적절한 종료 코드를 반환한다
- 카탈로그 검증 실패가 명확한 메시지와 함께 중단된다
- packed tarball 기준 스모크 테스트가 통과한다

## 15. 다음 단계

### 완료된 기반 작업
- [x] `package.json` 생성
  공개 배포 기준 `name`, `bin`, `files`, `publishConfig` 설정
- [x] `catalog.json` 생성
  `schemaVersion=1`, starter skill 2개 정의
- [x] `src/` 골격 구현
  CLI 파서, 대화형 설치 진입, 타깃 어댑터, 카탈로그 검증, 잠금/스테이징/마커 기록
- [x] README 작성
- [x] 테스트 및 `npm pack` 검증

### 남은 작업
- [ ] 남은 예외 경로 테스트 보강
  `lock` 메타데이터 손상, `EACCES`, symlink temp / source 예외
- [ ] 문서와 릴리스 체크리스트 지속 정리
  README 최신화, publish 전 검증 절차 점검
- [ ] `v2` 기능 설계 구체화
  `install --skills`, `list`, `remove`, `update`

## 참고 문서
- https://developers.openai.com/codex/skills
- https://geminicli.com/docs/cli/skills/
- https://code.claude.com/docs/ko/skills
