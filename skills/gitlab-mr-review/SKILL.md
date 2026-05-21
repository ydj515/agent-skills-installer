---
name: gitlab-mr-review
description: Review merge requests in internal GitLab using the GitLab API. Use when checking open merge requests for a specific project, collecting MR metadata, changed files, diffs, and pipeline status, and drafting structured review feedback for periodic or on-demand code review workflows authenticated with PRIVATE-TOKEN from GITLAB_TOKEN.
---

# GitLab MR Review

사내 GitLab의 특정 프로젝트에 대해 open merge request를 조회하고, GitLab API 응답을 바탕으로 리뷰 초안을 작성한다.

출력 모드는 고정으로 "채팅 응답 + markdown 저장"을 함께 수행한다.
장기 목표는 markdown 리뷰 파일과 GitLab 라인 단위 인라인 코멘트를 같은 finding 데이터에서 함께 생성하는 것이다.

## 사전 확인

1. `GITLAB_HOST` 환경 변수가 설정되어 있는지 확인한다.
2. `GITLAB_TOKEN` 환경 변수가 설정되어 있는지 확인한다.
3. 대상 `project_id`를 사용자 입력 또는 환경 변수로 받는다.
4. 인증 실패, 권한 부족, 잘못된 프로젝트 식별자라면 바로 원인을 설명하고 중단한다.
5. 결과 저장 루트는 `/Users/dongjin/dev/promptech/gitlab-review-reports` 를 기본값으로 사용한다.

## 입력 규칙

- `project_id`는 첫 번째 CLI 인자를 우선 사용한다.
- CLI 인자가 없으면 `GITLAB_PROJECT_ID` 환경 변수를 사용한다.
- 두 값이 모두 없으면 사용 예시와 함께 필요한 입력을 요청한다.

## 기본 절차

1. `scripts/list_mrs.sh <project_id>`로 특정 프로젝트의 open MR 목록을 조회한다.
2. 각 MR에 대해 `scripts/fetch_mr_details.sh <project_id> <mr_iid>`를 실행해 메타데이터를 수집한다.
3. 각 MR에 대해 `scripts/fetch_mr_changes.sh <project_id> <mr_iid>`를 실행해 변경 파일과 diff를 수집한다.
4. 필요하면 `scripts/fetch_mr_discussions.sh <project_id> <mr_iid>`를 실행해 기존 discussion과 이미 제기된 이슈를 확인한다.
5. `references/review-checklist.md`와 `references/team-rules.md`를 읽고 blocking issue, suggestion, open question을 구분한다.
6. 각 finding에 가능하면 `priority`를 부여해 코멘트 제목 앞에 `[P1]` ~ `[P5]` prefix가 붙도록 준비한다.
7. 리뷰 결과를 우선 `finding JSON`으로 구조화한다.
8. finding은 blocking issue만 모으지 말고, 의미 있는 `P3`/`P4` suggestion과 필요한 `Open question`까지 함께 포함한다.
9. 같은 finding 데이터를 사용해 MR별 markdown 리뷰 파일과 summary markdown을 생성한다. 필요하면 `scripts/generate_review_markdown_from_findings.sh <project_id> <mr_iid> <finding_json> <output_md>`를 사용한다.
10. 실제 리뷰를 등록해야 하면 `scripts/post_inline_review_comments.sh <project_id> <mr_iid> <finding_json>`으로 GitLab 인라인 코멘트를 등록한다.
11. 필요하면 일반 note 등록은 `scripts/post_review_comment.sh <project_id> <mr_iid> <comment_file>`를 사용한다.
12. 인라인 등록 성공 여부와 무관하게 markdown 결과물은 항상 저장한다.
13. 변경 파일이 많으면 중요한 경로를 우선 본다.
   - 인증/인가
   - 설정 파일
   - 데이터베이스/migration
   - 외부 API 연동
   - 공용 라이브러리

## API 규칙

- GitLab API는 `PRIVATE-TOKEN: $GITLAB_TOKEN` 헤더를 사용한다.
- 요청 URL은 항상 `GITLAB_HOST/api/v4/...` 형식을 사용한다.
- 토큰 값 자체는 절대 출력하지 않는다.
- API 실패 시 상태 코드와 응답 본문을 함께 요약한다.
- 페이지네이션이 필요한 목록 조회는 `per_page`와 `page`를 명시한다.

## 조회 대상

- 범위는 특정 프로젝트 전체의 open merge request다.
- 기본적으로 최신 업데이트 순으로 확인한다.
- draft MR도 조회되지만, 리뷰 우선순위는 낮게 둘 수 있다.
- 필요 시 작성자, 라벨, target branch로 후속 필터링한다.

## 최소 수집 정보

각 MR에 대해 최소한 아래 정보를 확인한다.

- MR IID
- 제목
- 설명
- 작성자
- draft 여부
- source branch / target branch
- merge status
- pipeline 상태
- updated_at
- 변경 파일 목록
- diff 요약
- 기존 discussion과 note

## 리뷰 기준

우선 아래 항목을 점검한다.

- 예외 처리 누락
- 인증/인가 누락
- 민감 정보 노출 가능성
- null/empty 처리 누락
- 데이터 정합성 문제
- 성능 저하 가능성
- 테스트 누락
- 운영 설정 변경 리스크
- API 호환성 문제
- 화면 렌더링과 사용자 흐름 문제

팀 기준이 있다면 `references/team-rules.md`를 우선 적용한다.
세부 점검 항목은 `references/review-checklist.md`를 사용한다.
`P1` ~ `P5` prefix 정의도 `references/team-rules.md`를 따른다.

## finding JSON 규칙

- markdown 리뷰와 GitLab 인라인 코멘트는 같은 `finding JSON`을 원본 데이터로 사용한다.
- **중요: JSON은 반드시 아래와 같은 최상위 객체 구조를 가져야 한다.** (배열만 단독으로 있으면 안 됨)
  ```json
  {
    "project_id": 659,
    "mr_iid": 13,
    "summary": "전체 요약 문구",
    "findings": [
      { "severity": "blocking", "priority": "P1", "title": "...", "body": "...", "file_path": "...", "anchor_line": 10, "line_side": "new" }
    ]
  }
  ```
- 코멘트 제목 앞에는 가능하면 `[P1]` ~ `[P5]` prefix를 붙인다.
- `title` 문자열 자체에 prefix를 직접 넣기보다는 `priority` 필드로 관리한다. 스크립트는 중복 prefix를 제거해 한 번만 출력한다.
- 포맷 정의는 `references/finding-format.md`를 따른다.
- 예시는 `references/finding-format.example.json`을 참고한다.
- 모든 finding은 가능하면 아래 정보를 포함한다.
  - `severity` (`blocking`, `suggestion`, `question` 중 하나)
  - `priority` (`P1` ~ `P5` 중 하나)
  - `title`, `body`, `file_path`, `line_start`, `line_end`, `anchor_line`, `line_side`, `dedupe_key`
- 범위 finding도 GitLab 인라인 코멘트 등록을 위해 anchor line 하나를 반드시 둔다.
- 인라인 등록이 불가능한 finding은 markdown only finding으로 남길 수 있다.
- finding 구성 시 `blocking`, `suggestion`, `question` 세 가지를 모두 후보로 검토하고, 가치가 있는 항목은 적극적으로 남긴다.

## 리뷰 워크플로우 가이드

1. **데이터 수집**: `fetch_mr_details.sh`, `fetch_mr_changes.sh` 등으로 정보를 모은다.
2. **리뷰 분석**: 체크리스트를 참조하여 이슈를 식별한다.
3. **JSON 생성**: 위 규칙에 맞는 최상위 객체 구조의 `findings.json`을 생성한다.
4. **Markdown 변환**: `generate_review_markdown_from_findings.sh`를 실행해 JSON을 Markdown 리뷰 파일(`review.md`)로 변환한다.
5. **파일 저장**: `write_mr_review_markdown.sh` 또는 `write_summary_markdown.sh`를 사용해 변환된 **소스 마크다운 파일**을 프로젝트별 표준 경로로 복사 저장한다.
6. **코멘트 등록**: (선택) `post_inline_review_comments.sh` 등으로 GitLab에 실제 코멘트를 등록한다.

## 저장 스크립트 사용 시 주의사항

- `write_mr_review_markdown.sh`와 `write_summary_markdown.sh`의 마지막 인자는 **이미 생성되어 있는 소스 마크다운 파일의 경로**이다. (출력 경로가 아님)
- 스크립트는 이 소스 파일을 읽어 타임스탬프가 포함된 표준 파일명으로 지정된 디렉토리에 복사한다.

## 리뷰 밀도 가이드

- merge 를 막아야 할 수준이면 `Blocking issues`로 남긴다.
- merge 차단 사유는 아니지만 개선 가치가 분명하면 `Non-blocking suggestions`로 남긴다.
- 의도 확인이 필요하거나 diff만으로 확신이 낮으면 `Open questions`로 남긴다.
- 결과적으로 "blocking이 0건"인 MR이어도, 의미 있는 `P3`, `P4`, `Open question`이 있으면 그대로 finding으로 생성하고 등록한다.
- 반대로 코멘트를 억지로 늘리지는 않는다. 중복이거나 가치가 낮으면 생략한다.

## 출력 형식

리뷰 결과는 아래 형식으로 정리한다.

### Summary
- 변경 목적과 영향 범위를 짧게 요약한다.

### Blocking issues
- merge 전에 수정이 필요하다고 판단되는 이슈만 적는다.
- 가능하면 `[P1]` 또는 `[P2]` prefix를 붙인다.
- 가능하면 파일, 라인 범위, 흐름, 영향 범위를 함께 적는다.

### Non-blocking suggestions
- 개선 제안, 테스트 보강, 가독성 향상 등을 적는다.
- 가능하면 `[P3]`, `[P4]`, `[P5]` prefix를 붙인다.
- 리뷰 가치가 있으면 실제 GitLab 인라인 코멘트로도 등록한다.
- 가능하면 파일과 라인 범위를 함께 적는다.

### Open questions
- diff만으로 단정하기 어려운 사항을 질문 형태로 적는다.
- 보통 `[P2]` ~ `[P4]` 중 하나를 붙인다.
- 리뷰 가치가 있으면 실제 GitLab 인라인 코멘트로도 등록한다.
- 가능하면 관련 파일과 라인 범위를 함께 적는다.

## 결과 저장 규칙

- 출력 모드는 고정으로 `chat + markdown` 이다.
- markdown 저장 루트는 `/Users/dongjin/dev/promptech/gitlab-review-reports` 이다.
- 프로젝트별 하위 디렉터리는 `project-<project_id>` 형식을 사용한다.
- MR별 파일명은 `<YYYY-MM-DD-HHMM>-mr-<mr_iid>.md` 형식을 사용한다.
- summary 파일명은 `<YYYY-MM-DD-HHMM>-summary.md` 형식을 사용한다.
- 한 번의 실행에서 생성한 MR 파일들과 summary 파일은 같은 타임스탬프를 공유한다.
- markdown 결과물은 인라인 코멘트 등록 성공 여부와 무관하게 항상 남긴다.

## 코멘트 등록 규칙

- 기본값은 코멘트 미등록이다.
- `POST_REVIEW=true`가 명시된 경우에만 실제 등록을 고려한다.
- 등록 전에 기존 discussion을 확인해 중복 코멘트를 줄인다.
- 여러 사안을 한 번에 뭉뚱그리지 말고, 핵심 이슈 위주로 남긴다.
- 토큰, 내부 URL, 민감한 로그를 코멘트에 포함하지 않는다.
- 라인 단위 인라인 코멘트가 가능한 finding은 `post_inline_review_comments.sh`를 우선 사용한다.
- 인라인 코멘트 제목은 가능하면 `[P1]` ~ `[P5]` prefix로 시작한다.
- `Blocking issues` 뿐 아니라 가치 있는 `Non-blocking suggestions`와 `Open questions`도 실제 인라인 코멘트 등록 대상이 될 수 있다.
- 인라인 등록 실패 항목은 markdown 리뷰 파일에 남기고, 실패 원인을 실행 결과에 요약한다.

## 리소스

- MR 목록 조회: `scripts/list_mrs.sh`
- MR 상세 조회: `scripts/fetch_mr_details.sh`
- MR 변경사항 조회: `scripts/fetch_mr_changes.sh`
- MR discussion 조회: `scripts/fetch_mr_discussions.sh`
- MR 일반 note 등록: `scripts/post_review_comment.sh`
- MR 인라인 코멘트 등록: `scripts/post_inline_review_comments.sh`
- finding JSON -> MR markdown 생성: `scripts/generate_review_markdown_from_findings.sh`
- MR 리뷰 markdown 저장: `scripts/write_mr_review_markdown.sh`
- 실행 summary markdown 저장: `scripts/write_summary_markdown.sh`
- 리뷰 체크리스트: `references/review-checklist.md`
- 팀 기준: `references/team-rules.md`
- finding 포맷: `references/finding-format.md`
- finding 예시: `references/finding-format.example.json`
- GitLab API 참고: `references/gitlab-api.md`

## 사용 예시

```bash
scripts/list_mrs.sh 12345
scripts/fetch_mr_details.sh 12345 17
scripts/fetch_mr_changes.sh 12345 17
scripts/fetch_mr_discussions.sh 12345 17
scripts/generate_review_markdown_from_findings.sh 12345 17 findings.json review.md
scripts/write_mr_review_markdown.sh 12345 17 review-comment.md
scripts/write_summary_markdown.sh 12345 summary.md
scripts/post_inline_review_comments.sh 12345 17 findings.json
scripts/post_review_comment.sh 12345 17 review-comment.md
```

```bash
GITLAB_PROJECT_ID=12345 scripts/list_mrs.sh
```

## 실패 처리

- `GITLAB_HOST` 또는 `GITLAB_TOKEN`이 없으면 필요한 환경 변수를 안내하고 종료한다.
- `project_id`가 없으면 인자 또는 환경 변수 사용 예시를 보여주고 종료한다.
- API 응답이 실패하면 상태 코드와 응답 일부를 요약한다.
- diff가 너무 커서 한 번에 판단하기 어려우면 우선순위 파일 중심 리뷰로 전환한다.
- 결과 저장 디렉터리를 만들 수 없으면 권한 문제와 대상 경로를 함께 보고한다.
- 코멘트 등록 실패 시 등록을 반복 시도하지 말고 원인을 기록한다.
- 인라인 위치를 계산할 수 없는 finding은 무리해서 등록하지 말고 markdown 결과물에만 남긴다.
