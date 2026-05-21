# gitlab-mr-review

사내 GitLab 프로젝트의 open merge request를 조회하고, 변경점과 파이프라인 상태를 바탕으로 리뷰 초안을 만들고 GitLab 인라인 코멘트까지 등록할 수 있게 정리한 스킬 디렉터리다.

이 디렉터리는 크게 아래 작업을 돕는다.

- 특정 프로젝트의 open MR 목록 조회
- MR 상세 정보, 변경 파일, discussion 수집
- 리뷰 초안 작성에 필요한 기준 문서 제공
- `finding JSON` 기준 리뷰 데이터 정리
- MR별 markdown 저장
- 필요 시 GitLab MR 인라인 코멘트 등록

## 이 스킬의 목적

이 스킬의 목적은 MR 리뷰를 사람이 매번 처음부터 수작업으로 정리하지 않도록, 다음 과정을 재사용 가능한 shell 스크립트와 문서로 표준화하는 것이다.

- GitLab API 조회 절차 표준화
- 리뷰 기준 문서화
- 결과 저장 경로와 파일명 규칙 통일
- `finding JSON -> markdown -> GitLab inline comment` 흐름 표준화
- blocking issue뿐 아니라 `P3`, `P4`, `Open question`까지 재사용 가능한 형식으로 남길 수 있게 함
- blocking issue가 0건이어도 가치 있는 suggestion/question을 남길 수 있게 자동화 기준 정리

즉, "프로젝트 ID만 주면 open MR을 조회하고, 리뷰에 필요한 자료를 모은 뒤, finding JSON과 markdown 결과물을 만들고, 필요하면 실제 GitLab 리뷰까지 남길 수 있게 하는 스킬"이라고 보면 된다.

## 디렉터리 구조

```text
gitlab-mr-review/
├── README.md
├── SKILL.md
├── agents/
│   └── openai.yaml
├── references/
│   ├── finding-format.example.json
│   ├── finding-format.md
│   ├── gitlab-api.md
│   ├── review-checklist.md
│   └── team-rules.md
└── scripts/
    ├── common.sh
    ├── list_mrs.sh
    ├── fetch_mr_details.sh
    ├── fetch_mr_changes.sh
    ├── fetch_mr_discussions.sh
    ├── generate_review_markdown_from_findings.sh
    ├── write_mr_review_markdown.sh
    ├── write_summary_markdown.sh
    ├── post_inline_review_comments.sh
    └── post_review_comment.sh
```

## 주요 문서

### [SKILL.md](/Users/dongjin/dev/study/test/gitlab-mr-review/SKILL.md)

이 스킬이 어떤 입력을 받고, 어떤 순서로 움직이며, 어떤 결과를 만들어야 하는지 설명하는 핵심 문서다.

### [references/review-checklist.md](/Users/dongjin/dev/study/test/gitlab-mr-review/references/review-checklist.md)

리뷰 시 실제로 무엇을 점검할지 정리한 체크리스트다. blocking만 찾고 끝내지 않고, suggestion과 open question 후보도 함께 수집하도록 돕는다.

### [references/team-rules.md](/Users/dongjin/dev/study/test/gitlab-mr-review/references/team-rules.md)

무엇을 blocking issue, suggestion, open question으로 볼지와, `[P1]` ~ `[P5]` prefix를 어떻게 쓸지에 대한 팀 기준 문서다.

### [references/finding-format.md](/Users/dongjin/dev/study/test/gitlab-mr-review/references/finding-format.md)

markdown 리뷰와 GitLab 인라인 코멘트가 공통으로 사용할 `finding JSON` 포맷 문서다.

### [references/finding-format.example.json](/Users/dongjin/dev/study/test/gitlab-mr-review/references/finding-format.example.json)

`blocking`, `suggestion`, `question`을 함께 담은 사람이 읽기 쉬운 예시 JSON이다.

### [references/gitlab-api.md](/Users/dongjin/dev/study/test/gitlab-mr-review/references/gitlab-api.md)

GitLab API 기본 호출 형태와 환경 변수 사용 방식을 간단히 정리한 참고 문서다.

## 환경 변수

이 스킬을 쓰기 전에 아래 환경 변수가 필요하다.

```bash
export GITLAB_HOST="https://git.promptech.co.kr"
export GITLAB_TOKEN="..."
```

선택적으로 아래 환경 변수도 사용할 수 있다.

```bash
export GITLAB_PROJECT_ID="648"
export OUTPUT_DIR="/path/to/output"
export POST_REVIEW="true"
export RUN_TIMESTAMP="2026-03-10-0900"
```

각 변수의 의미는 다음과 같다.

- `GITLAB_HOST`
  - GitLab 서버 주소
- `GITLAB_TOKEN`
  - GitLab API 인증 토큰
- `GITLAB_PROJECT_ID`
  - 기본 프로젝트 ID
- `OUTPUT_DIR`
  - 리뷰 markdown 저장 루트
- `POST_REVIEW`
  - 실제 note 또는 인라인 코멘트 등록 허용 여부
- `RUN_TIMESTAMP`
  - 저장 파일명 타임스탬프 강제 지정

## 기본 사용 흐름

이 디렉터리 기준 기본 워크플로우는 아래와 같다.

1. 프로젝트의 open MR 목록 조회
2. 각 MR 상세 조회
3. 각 MR 변경사항 조회
4. 필요 시 discussion 조회
5. `blocking`, `suggestion`, `question`을 모두 후보로 검토
6. `finding JSON` 작성
7. MR markdown 저장
8. 필요 시 GitLab 인라인 코멘트 등록
9. summary markdown 저장

프로젝트 `648` 예시:

```bash
export GITLAB_PROJECT_ID="648"

/Users/dongjin/dev/study/test/gitlab-mr-review/scripts/list_mrs.sh 648
/Users/dongjin/dev/study/test/gitlab-mr-review/scripts/fetch_mr_details.sh 648 8
/Users/dongjin/dev/study/test/gitlab-mr-review/scripts/fetch_mr_changes.sh 648 8
/Users/dongjin/dev/study/test/gitlab-mr-review/scripts/fetch_mr_discussions.sh 648 8
```

## finding JSON 기반 예시

프로젝트 `648`, MR `!8` 기준 예시다.

```bash
cat > ./findings-648-8.json <<'JSON_EOF'
{
  "project_id": 648,
  "mr_iid": 8,
  "summary": "게시글 작성/수정 화면과 인라인 이미지 처리 로직이 함께 추가된 MR",
  "findings": [
    {
      "id": "mr8-001",
      "severity": "blocking",
      "priority": "P1",
      "category": "ui-flow",
      "title": "글쓰기 화면에서 boards 모델이 누락됩니다",
      "body": "템플릿은 boards를 순회하지만 컨트롤러가 모델에 boards를 넣지 않아 게시판 셀렉트가 비어 보일 수 있습니다.",
      "file_path": "src/main/java/kr/co/promptech/springboottutorialv2/controller/PostController.java",
      "line_start": 73,
      "line_end": 80,
      "anchor_line": 78,
      "line_side": "new",
      "dedupe_key": "postcontroller-write-missing-boards-model"
    },
    {
      "id": "mr8-002",
      "severity": "suggestion",
      "priority": "P3",
      "category": "test",
      "title": "boards 모델 계약을 검증하는 테스트 보강이 있으면 회귀를 줄일 수 있습니다",
      "body": "create/edit 진입 시 boards가 항상 내려가는지 검증하는 MVC 테스트를 추가하면 비슷한 회귀를 빨리 잡을 수 있습니다.",
      "file_path": "src/main/java/kr/co/promptech/springboottutorialv2/controller/PostController.java",
      "line_start": 73,
      "line_end": 92,
      "anchor_line": 78,
      "line_side": "new",
      "dedupe_key": "postcontroller-boards-model-test-coverage"
    },
    {
      "id": "mr8-003",
      "severity": "question",
      "priority": "P3",
      "category": "config",
      "title": "이 MR은 app.base-url 설정을 모든 실행 환경에 이미 배포했다고 가정해도 되는지 확인이 필요합니다",
      "body": "샘플 설정이나 배포 문서 변경이 diff에서 보이지 않아, 이미 공통 환경에 선반영된 값인지 확인이 필요합니다.",
      "file_path": "src/main/java/kr/co/promptech/springboottutorialv2/service/PostService.java",
      "line_start": 30,
      "line_end": 34,
      "anchor_line": 31,
      "line_side": "new",
      "dedupe_key": "postservice-app-base-url-open-question"
    }
  ]
}
JSON_EOF

/Users/dongjin/dev/study/test/gitlab-mr-review/scripts/generate_review_markdown_from_findings.sh 648 8 ./findings-648-8.json ./review-648-8.md
POST_REVIEW=true /Users/dongjin/dev/study/test/gitlab-mr-review/scripts/post_inline_review_comments.sh 648 8 ./findings-648-8.json
```

위 예시처럼 이제는 blocking만이 아니라 `P3`, `P4`, `Open question`도 같은 finding 구조로 만들어 markdown과 GitLab 코멘트에 함께 사용할 수 있다.

자동화도 같은 기준을 따른다. 즉, `blocking issue`가 0건이어도 의미 있는 `P3`, `P4`, `Open question`이 있으면 finding으로 남기고, 라인 단위로 특정 가능하면 실제 GitLab 인라인 코멘트 등록 대상에 포함한다.

## 저장 예시

프로젝트 `648`, MR `!8` 리뷰 파일 저장 예시:

```bash
/Users/dongjin/dev/study/test/gitlab-mr-review/scripts/write_mr_review_markdown.sh 648 8 ./review-648-8.md
/Users/dongjin/dev/study/test/gitlab-mr-review/scripts/write_summary_markdown.sh 648 ./summary-648.md
```

실제로 저장되면 기본적으로 아래 경로에 파일이 생긴다.

```text
/Users/dongjin/dev/promptech/gitlab-review-reports/project-648/<timestamp>-mr-8.md
/Users/dongjin/dev/promptech/gitlab-review-reports/project-648/<timestamp>-summary.md
```

## 프로젝트 648 빠른 시작

```bash
export GITLAB_HOST="https://git.promptech.co.kr"
export GITLAB_TOKEN="..."
export GITLAB_PROJECT_ID="648"

/Users/dongjin/dev/study/test/gitlab-mr-review/scripts/list_mrs.sh 648
/Users/dongjin/dev/study/test/gitlab-mr-review/scripts/fetch_mr_details.sh 648 8 > /tmp/mr-648-8-details.json
/Users/dongjin/dev/study/test/gitlab-mr-review/scripts/fetch_mr_changes.sh 648 8 > /tmp/mr-648-8-changes.json
/Users/dongjin/dev/study/test/gitlab-mr-review/scripts/fetch_mr_discussions.sh 648 8 > /tmp/mr-648-8-discussions.json
/Users/dongjin/dev/study/test/gitlab-mr-review/scripts/generate_review_markdown_from_findings.sh 648 8 ./findings-648-8.json ./review-648-8.md
POST_REVIEW=true /Users/dongjin/dev/study/test/gitlab-mr-review/scripts/post_inline_review_comments.sh 648 8 ./findings-648-8.json
/Users/dongjin/dev/study/test/gitlab-mr-review/scripts/write_mr_review_markdown.sh 648 8 ./review-648-8.md
/Users/dongjin/dev/study/test/gitlab-mr-review/scripts/write_summary_markdown.sh 648 ./summary-648.md
```

## 실제 검증 예시

프로젝트 `648`, MR `!8`에서는 아래 조합으로 실제 GitLab 인라인 코멘트 등록을 검증했다.

- `P1 blocking` 3건
- `P3 suggestion` 1건
- `P3 open question` 1건

추가로 등록된 코멘트 예시는 아래와 같다.

- `[P3] 글쓰기 진입 기본값 계산에 빈 목록 방어 로직을 두면 회귀를 줄일 수 있습니다`
- `[P3] 글쓰기 진입 시 boards와 categories가 항상 비어 있지 않다는 도메인 보장이 있는지 확인이 필요합니다`

즉, 이 스킬은 이제 blocking 전용이 아니라, 실제 운영 리뷰에서 `P3`, `P4`, `Open question`까지 함께 다루는 기준으로 맞춰져 있다.

## 자동화 파일

Codex 자동화는 보통 아래 경로에 저장된다.

```text
${CODEX_HOME:-$HOME/.codex}/automations/<automation_id>/automation.toml
```

이번 리뷰 자동화 예시는 아래 경로다.

```text
/Users/dongjin/.codex/automations/gitlab-mr-review-648/automation.toml
```

짧은 예시는 아래처럼 둘 수 있다.

```toml
version = 1
id = "gitlab-mr-review-648"
name = "GitLab MR Review 648"
prompt = "프로젝트 648의 open merge request를 조회하고, 변경점과 파이프라인 상태를 검토해 structured review draft를 작성한다. 리뷰 기준은 [$gitlab-mr-review](/Users/dongjin/.codex/skills/gitlab-mr-review/SKILL.md)를 따른다. 결과는 채팅 응답과 markdown 저장을 함께 수행한다. blocking issue, non-blocking suggestion, open question을 구분하고, 기존 discussion과 중복되는 지적은 줄인다. blocking issue가 0건이어도 의미 있는 P3, P4, open question은 적극적으로 finding으로 남기고, 라인 단위로 특정 가능하면 실제 리뷰 코멘트 등록 대상에 포함한다."
status = "PAUSED"
rrule = "RRULE:FREQ=WEEKLY;BYHOUR=11;BYMINUTE=30;BYDAY=MO,TU,WE,TH,FR"
execution_environment = "worktree"
cwds = ["/Users/dongjin/dev/study/test"]
```

## 각 shell 스크립트 설명

### [common.sh](/Users/dongjin/dev/study/test/gitlab-mr-review/scripts/common.sh)

모든 스크립트가 공통으로 쓰는 유틸리티 모음이다.

하는 일:

- 필수 환경 변수 확인
- 필수 명령 존재 여부 확인
- `project_id` 해석
- GitLab API base URL 생성
- GET/POST 공통 curl 호출
- 결과 저장 경로 계산
- report 디렉터리 생성
- JSON pretty print

즉, 나머지 스크립트의 공통 기반이다.

### [list_mrs.sh](/Users/dongjin/dev/study/test/gitlab-mr-review/scripts/list_mrs.sh)

특정 프로젝트의 open merge request 목록을 조회한다.

하는 일:

- `project_id`를 인자 또는 환경 변수에서 받음
- 기본적으로 `opened`, `updated_at desc` 기준 조회
- 페이지 번호와 페이지 크기도 받을 수 있음

주 사용 목적:

- 현재 리뷰할 MR 후보를 찾는 첫 단계

### [fetch_mr_details.sh](/Users/dongjin/dev/study/test/gitlab-mr-review/scripts/fetch_mr_details.sh)

단일 MR의 메타데이터를 조회한다.

하는 일:

- MR 제목
- 설명
- 작성자
- source/target branch
- merge status
- pipeline 정보
- updated_at

주 사용 목적:

- 리뷰 우선순위와 위험도 판단

### [fetch_mr_changes.sh](/Users/dongjin/dev/study/test/gitlab-mr-review/scripts/fetch_mr_changes.sh)

단일 MR의 변경 파일과 diff를 조회한다.

하는 일:

- 변경 파일 목록
- 신규/수정/삭제 여부
- diff 본문

주 사용 목적:

- 실제 코드 리뷰 대상 수집

### [fetch_mr_discussions.sh](/Users/dongjin/dev/study/test/gitlab-mr-review/scripts/fetch_mr_discussions.sh)

단일 MR의 discussion과 note를 조회한다.

하는 일:

- 기존 discussion 확인
- 이미 지적된 이슈 여부 확인
- 중복 코멘트 방지용 데이터 수집

주 사용 목적:

- 같은 문제를 중복 등록하지 않기 위함

### [generate_review_markdown_from_findings.sh](/Users/dongjin/dev/study/test/gitlab-mr-review/scripts/generate_review_markdown_from_findings.sh)

`finding JSON`을 읽어 MR 리뷰 markdown 파일을 생성한다.

하는 일:

- `blocking`, `suggestion`, `question`을 섹션별로 정리
- 제목 앞에 `[P1]` ~ `[P5]` prefix를 붙여 출력
- `title`에 prefix가 이미 있어도 중복 제거
- 같은 finding 데이터로 markdown 산출물 생성

주 사용 목적:

- review draft를 사람이 읽기 쉬운 markdown으로 저장
- GitLab 인라인 코멘트 등록과 같은 원본 데이터를 재사용

### [write_mr_review_markdown.sh](/Users/dongjin/dev/study/test/gitlab-mr-review/scripts/write_mr_review_markdown.sh)

완성된 MR 리뷰 markdown 파일을 표준 저장 경로로 복사한다.

하는 일:

- 프로젝트 디렉터리 생성
- 타임스탬프 규칙 적용
- `<timestamp>-mr-<iid>.md` 이름으로 저장

### [write_summary_markdown.sh](/Users/dongjin/dev/study/test/gitlab-mr-review/scripts/write_summary_markdown.sh)

실행 요약 markdown 파일을 표준 저장 경로로 복사한다.

하는 일:

- 프로젝트 디렉터리 생성
- 타임스탬프 규칙 적용
- `<timestamp>-summary.md` 이름으로 저장

### [post_inline_review_comments.sh](/Users/dongjin/dev/study/test/gitlab-mr-review/scripts/post_inline_review_comments.sh)

`finding JSON`을 읽어 GitLab MR에 라인 단위 인라인 코멘트를 등록한다.

하는 일:

- 최신 MR version의 diff refs 조회
- `dedupe_key` 기준 중복 코멘트 방지
- `priority` 기준 `[P1]` ~ `[P5]` prefix를 제목에 부여
- `blocking`뿐 아니라 가치 있는 `suggestion`, `question`도 등록 가능
- `POST_REVIEW=true`일 때만 실제 등록 수행

주 사용 목적:

- markdown에 남긴 finding을 실제 GitLab 라인 코멘트로 반영
- P3, P4, Open question까지 실제 리뷰 흐름에 태우기

### [post_review_comment.sh](/Users/dongjin/dev/study/test/gitlab-mr-review/scripts/post_review_comment.sh)

완성된 markdown 파일을 GitLab 일반 note로 등록한다.

하는 일:

- 파일 본문을 GitLab note API에 전송
- `POST_REVIEW=true`일 때만 실제 등록 수행

주 사용 목적:

- 인라인이 아닌 일반 MR 코멘트가 필요할 때 사용

## 리뷰 작성 권장 방식

- 먼저 `Blocking issues`를 정리한다.
- 그 다음 merge 차단은 아니지만 개선 가치가 있는 `P3`, `P4` suggestion을 정리한다.
- 마지막으로 diff만으로 단정하기 어려운 `Open question`을 남긴다.
- `Blocking issues`가 없더라도 의미 있는 `P3`, `P4`, `Open question`은 생략하지 않는다.
- `title`에는 `[P1]` 같은 prefix를 직접 넣지 말고 `priority`로 관리한다.
- 중복 지적은 피하고, 라인 단위로 특정 가능한 finding은 가능한 한 `file_path`, `line_start`, `line_end`, `anchor_line`을 채운다.

## 실패 시 점검 항목

- `GITLAB_HOST`, `GITLAB_TOKEN`이 설정되어 있는지 확인
- `project_id`가 올바른지 확인
- GitLab API 접근이 가능한지 확인
- `POST_REVIEW`가 정말 `true`인지 확인
- `finding JSON`의 `file_path`, `anchor_line`, `dedupe_key`가 올바른지 확인
- 기존 discussion과 중복이라 등록이 건너뛰어진 것은 아닌지 확인

## 비고

이 경로는 워크스페이스 안의 복사본이다. 실제 자동화가 어느 경로의 skill을 참조하는지는 Codex 설정에 따라 달라질 수 있으므로, 운영 중인 자동화가 읽는 기준 경로와 함께 관리하는 것이 안전하다.
