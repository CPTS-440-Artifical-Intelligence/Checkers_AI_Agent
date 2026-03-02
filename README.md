# Checkers_AI_Agent
CPTS_440 Artifical Intelligence Group Project


## API Contract

See the API contract in [`api/README.md`](api/README.md#api-contract).


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
