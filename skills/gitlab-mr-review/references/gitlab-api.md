# GitLab API Notes

## 기본 환경 변수

```bash
export GITLAB_HOST="https://gitlab.example.internal"
export GITLAB_TOKEN="..."
```

## 공통 헤더

```bash
PRIVATE-TOKEN: $GITLAB_TOKEN
```

## MR 목록 조회

```text
GET /api/v4/projects/:project_id/merge_requests?state=opened
```

## MR 상세 조회

```text
GET /api/v4/projects/:project_id/merge_requests/:mr_iid
```

## MR 변경사항 조회

```text
GET /api/v4/projects/:project_id/merge_requests/:mr_iid/changes
```

## MR discussion 조회

```text
GET /api/v4/projects/:project_id/merge_requests/:mr_iid/discussions
```

## MR version 조회

```text
GET /api/v4/projects/:project_id/merge_requests/:mr_iid/versions
```

## MR note 등록

```text
POST /api/v4/projects/:project_id/merge_requests/:mr_iid/notes
```

## MR 인라인 discussion 등록

```text
POST /api/v4/projects/:project_id/merge_requests/:mr_iid/discussions
```
