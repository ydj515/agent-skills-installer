# Finding JSON Format

이 문서는 markdown 리뷰 파일과 GitLab 인라인 코멘트가 공통으로 사용할 `finding` 데이터 포맷을 정의한다.
사람이 읽기 쉬운 JSON을 목표로 하며, 스크립트는 이 포맷을 입력으로 받아 markdown 생성과 인라인 등록을 수행한다.

## 설계 원칙

- 사람이 눈으로 읽고 수정하기 쉬워야 한다.
- markdown 요약과 GitLab 인라인 코멘트가 같은 데이터를 재사용해야 한다.
- 한 finding은 하나의 핵심 문제만 표현한다.
- 모든 finding은 가능한 한 파일 경로와 라인 정보를 가진다.
- 범위 코멘트도 anchor line 하나를 기준으로 등록 가능해야 한다.
- 리뷰 코멘트 제목 앞에는 `[P1]` ~ `[P5]` prefix를 붙일 수 있어야 한다.
- `blocking`뿐 아니라 `suggestion`, `question`도 같은 구조로 다룰 수 있어야 한다.

## 최상위 구조

```json
{
  "project_id": 648,
  "mr_iid": 8,
  "mr_url": "https://gitlab.example/mr/8",
  "generated_at": "2026-03-10T20:17:00+09:00",
  "summary": "변경 목적과 영향 범위 요약",
  "findings": []
}
```

## finding 객체

```json
{
  "id": "mr8-001",
  "severity": "blocking",
  "priority": "P1",
  "category": "data-integrity",
  "title": "Mapper 파라미터 이름 불일치",
  "body": "MyBatis SQL에서 post_id를 참조하지만 Java 메서드 파라미터에는 같은 이름이 없어 런타임 바인딩 오류가 발생할 수 있습니다.",
  "file_path": "src/main/resources/mapper/AttachmentMapper.xml",
  "line_start": 65,
  "line_end": 69,
  "anchor_line": 68,
  "line_side": "new",
  "code_context": "WHERE  post_id = #{post_id}",
  "suggested_fix": "@Param(\"post_id\")를 추가하거나 SQL placeholder를 postId로 통일합니다.",
  "confidence": "high",
  "dedupe_key": "attachmentmapper-findinline-postid-binding"
}
```

## 필드 설명

- `id`
  - finding 식별자
  - 한 MR 안에서 유일해야 한다.
- `severity`
  - `blocking`, `suggestion`, `question` 중 하나
- `priority`
  - `P1`, `P2`, `P3`, `P4`, `P5` 중 하나
  - 리뷰 코멘트 제목 앞 prefix로 사용한다.
  - 생략 시 스크립트는 `severity` 기준 기본값을 추론할 수 있다.
- `category`
  - 예: `security`, `stability`, `data-integrity`, `test`, `ui-flow`, `config`, `docs`
- `title`
  - 짧고 스캔하기 쉬운 제목
  - `title` 자체에는 `[P1]` ~ `[P5]` prefix를 넣지 않는 것을 권장한다. prefix는 `priority`에서 관리한다.
- `body`
  - 실제 리뷰 본문
  - GitLab 인라인 코멘트 본문과 markdown 본문에 공통 사용한다.
- `file_path`
  - 저장소 루트 기준 경로
- `line_start`
  - finding 범위 시작 라인
- `line_end`
  - finding 범위 종료 라인
- `anchor_line`
  - GitLab 인라인 코멘트를 달 기준 라인
  - 범위 코멘트인 경우에도 하나는 반드시 지정한다.
- `line_side`
  - `new` 또는 `old`
  - 일반적으로 MR 리뷰는 `new`를 기본으로 사용한다.
- `code_context`
  - 사람이 빠르게 이해할 수 있도록 넣는 짧은 코드 단서
  - 선택 필드다.
- `suggested_fix`
  - 제안 수정 방향
  - 선택 필드다.
- `confidence`
  - `high`, `medium`, `low`
- `dedupe_key`
  - 기존 discussion과 중복 여부를 판단할 때 사용할 안정적인 키

## priority 기본 매핑

- `severity=blocking` 이고 특별한 완급이 없으면 기본값은 `P1`
- `severity=suggestion` 이면 기본값은 `P3`
- `severity=question` 이면 기본값은 `P3`
- 더 약한 제안은 명시적으로 `P4`, `P5`를 준다.
- 강하지만 당장 merge 차단까진 아닌 의견은 명시적으로 `P2`를 준다.

## 권장 규칙

- `line_start`, `line_end`, `anchor_line` 은 모두 1 이상 정수로 기록한다.
- `anchor_line` 은 `line_start <= anchor_line <= line_end` 를 만족하게 둔다.
- 인라인 등록이 필요한 finding은 `file_path`, `anchor_line`, `line_side` 를 반드시 가진다.
- markdown only finding도 가능하지만, 그 경우 `file_path` 또는 `anchor_line` 이 없는 이유를 별도로 기록하는 것이 좋다.
- 가능하면 모든 finding에 `priority`를 명시한다.
- `title` 앞에 이미 `[P1]` 같은 prefix가 있어도 스크립트는 중복 prefix를 제거하고 한 번만 출력한다.
- `suggestion`과 `question`도 라인 단위로 특정 가능하면 실제 GitLab 인라인 코멘트 등록 대상으로 본다.

## 사람이 읽기 쉬운 예시

```json
{
  "project_id": 648,
  "mr_iid": 8,
  "generated_at": "2026-03-10T20:17:00+09:00",
  "summary": "게시글 작성/수정 화면과 인라인 이미지 처리 로직이 함께 추가된 MR",
  "findings": [
    {
      "id": "mr8-001",
      "severity": "blocking",
      "priority": "P1",
      "category": "ui-flow",
      "title": "글쓰기 화면에 boards 모델이 누락됨",
      "body": "템플릿은 boards를 순회하지만 컨트롤러가 모델에 boards를 넣지 않아 게시판 셀렉트가 비어 보일 수 있습니다.",
      "file_path": "src/main/java/com/example/springboottutorialv2/controller/PostController.java",
      "line_start": 73,
      "line_end": 80,
      "anchor_line": 78,
      "line_side": "new",
      "code_context": "model.addAttribute(\"selectedBoardUrl\", selectedBoardUrl);",
      "suggested_fix": "boards 목록도 model에 추가하고 관련 테스트를 보강합니다.",
      "confidence": "high",
      "dedupe_key": "postcontroller-write-missing-boards-model"
    },
    {
      "id": "mr8-002",
      "severity": "suggestion",
      "priority": "P3",
      "category": "test",
      "title": "boards 모델 계약을 검증하는 테스트 보강이 있으면 회귀를 줄일 수 있음",
      "body": "이번 변경은 템플릿과 컨트롤러 모델 계약에 의존하므로 create/edit 진입 시 boards가 항상 내려가는지 검증하는 MVC 테스트를 한두 개 추가해 두면 비슷한 회귀를 빨리 잡을 수 있습니다.",
      "file_path": "src/main/java/com/example/springboottutorialv2/controller/PostController.java",
      "line_start": 73,
      "line_end": 92,
      "anchor_line": 78,
      "line_side": "new",
      "confidence": "medium",
      "dedupe_key": "postcontroller-boards-model-test-coverage"
    },
    {
      "id": "mr8-003",
      "severity": "question",
      "priority": "P3",
      "category": "config",
      "title": "이 MR은 app.base-url 설정을 모든 실행 환경에 이미 배포했다고 가정해도 되는지 확인 필요",
      "body": "서비스 코드에서 새 설정값을 읽기 시작했는데 샘플 설정이나 배포 문서 변경이 diff에서 보이지 않습니다. 이미 공통 환경에 선반영된 값인지, 아니면 이번 MR 안에서 함께 문서화해야 하는지 확인 부탁드립니다.",
      "file_path": "src/main/java/com/example/springboottutorialv2/service/PostService.java",
      "line_start": 30,
      "line_end": 34,
      "anchor_line": 31,
      "line_side": "new",
      "confidence": "medium",
      "dedupe_key": "postservice-app-base-url-open-question"
    }
  ]
}
```
