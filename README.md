# Checkers_AI_Agent
CPTS_440 Artifical Intelligence Group Project


## API Contract

See the API contract in [`api/README.md`](api/README.md#api-contract).

## Run Both Servers (One Click)

From the repo root:

```bat
start-local-dev.bat
```

This opens two terminal windows:
- API: runs `api\start-local-api.bat` (default `http://127.0.0.1:8000`)
- Web: runs `npm.cmd run dev` in `web\` (default `http://localhost:5173`)

Note:
- Local API state backend defaults to in-memory.
- For multi-instance deployment, configure API to use Redis (`CHECKERS_API_STATE_BACKEND=redis` + `CHECKERS_REDIS_URL`).

Optional API port:

```bat
start-local-dev.bat 8000
```

Order of args:
1. API port

## Run Frontend Only

From `web\`:

```bat
npm-run-dev.bat
```

This script opens `http://localhost:5173/` in Chrome, then runs `npm run dev`.

## Deployment

### Frontend (Netlify)

`netlify.toml` is now in repo root for monorepo deploys:
- base directory: `web`
- build command: `npm ci && npm run build`
- publish directory: `dist`

Important:
- Update the proxy target host in `netlify.toml` from `REPLACE_WITH_YOUR_RENDER_API_HOST` to your real Render API host.
- With that `/api/*` proxy in place, the browser calls Netlify origin, so CORS is not required for normal frontend traffic.

### Backend (Render)

`render.yaml` is now in repo root and defines the API service:
- root directory: `api`
- build: `pip install -e ../engine && pip install -e .`
- start: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`

For multi-instance support, keep:
- `CHECKERS_API_ENGINE_MODE=external`
- `CHECKERS_API_STATE_BACKEND=redis`
- `CHECKERS_REDIS_URL=<your redis connection url>`
- optional `CHECKERS_REDIS_GAME_TTL_S=86400`

### CORS (Only If Needed)

CORS is optional and disabled by default.

Set `CHECKERS_CORS_ORIGINS` only if your frontend talks directly to Render API origin (without Netlify proxy), for example:

`CHECKERS_CORS_ORIGINS=https://your-site.netlify.app,http://localhost:5173`


## Contributing

### Begin New Feature

1. Refresh the local `dev` branch to be upstream:
 ```
 git fetch origin
 git checkout dev
 git pull origin dev
 ```
2. Create a new feature branch locally, then push to the repo:
 ```
 git checkout -b feature/my-feature
 git push -u origin feature/my-feature
 ```

### Rebasing
If you've worked on your feature branch and the collaborative branch (`dev`) has been updated/pushed to, then we have to be mindful of merge conflicts.
We do this by rebasing your work from the previous commit of `dev` to the latest commit.
This means it will order the `dev` new commits first before placing yours on top.
[More Info on Rebasing](https://www.atlassian.com/git/tutorials/merging-vs-rebasing)

1. From your branch, fetch all the repo's latest changes and rebase off of `origin/dev`:
 ```
 git checkout feature/my-feature
 git fetch origin
 git rebase origin/dev
 ```
2. If the same file is modified in both `dev` and your branch, you will likely need to resolve merge conflicts manually in your editor. Once you solve the conflicting files:
 ```
 git add .
 git rebase --continue
 ```
3. Repeat until rebase completes successfully.
4. If you ever need to abort:
 ```
 git rebase --abort
 ```
5. Once resolved, push:
 ```
 git push -f origin feature/my-feature
 ```

### Finish New Feature

1. Push all your work to your local branch.
 ```
 git add .
 git commit -m "your commit message"
 git push
 ```
2. Create a Pull Request through GitHub
   - Select the `Pull Request` tab in the repo.
   - Select `New pull request`.
   - Select `dev` for base, and your `feature/my-feature` for compare.
3. Wait for the team to review before merging.
4. Once merged, delete your `feature/my-feature` branch.
