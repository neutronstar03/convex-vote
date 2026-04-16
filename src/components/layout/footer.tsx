import pkg from '../../../package.json'

// Static regex patterns (avoid re-compilation on every call)
const GIT_SHA_REGEX = /^[a-f0-9]{7,40}$/i
const TRAILING_SLASH_REGEX = /\/$/

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
    </svg>
  )
}

function getRepoUrl(repository: unknown): string | null {
  if (typeof repository === 'string') {
    return repository
  }
  if (repository && typeof repository === 'object' && 'url' in repository) {
    const url = (repository as { url?: unknown }).url
    return typeof url === 'string' ? url : null
  }
  return null
}

function normalizeRepoUrl(url: string): string {
  let out = url.trim()
  if (out.startsWith('git+'))
    out = out.slice('git+'.length)
  if (out.startsWith('git://'))
    out = `https://${out.slice('git://'.length)}`
  if (out.endsWith('.git'))
    out = out.slice(0, -'.git'.length)
  return out
}

function isLikelyGitSha(value: string): boolean {
  const s = value.trim()
  // SHA-1 is 40 hex chars; we allow >=7 to support short SHAs
  return GIT_SHA_REGEX.test(s)
}

function getAuthorInfo(author: unknown): { name: string, url: string | null } | null {
  if (typeof author === 'string') {
    const name = author
    return { name, url: null }
  }

  if (author && typeof author === 'object') {
    const name = 'name' in author ? (author as { name?: unknown }).name : undefined
    if (typeof name !== 'string' || !name.trim()) {
      return null
    }

    const urlRaw = 'url' in author ? (author as { url?: unknown }).url : undefined
    const url = typeof urlRaw === 'string' ? urlRaw : null
    return { name, url }
  }

  return null
}

export function Footer() {
  const version = typeof pkg.version === 'string' ? pkg.version : null
  const repoUrlRaw = getRepoUrl(pkg.repository)
  const repoUrl = repoUrlRaw ? normalizeRepoUrl(repoUrlRaw) : null
  const author = getAuthorInfo(pkg.author)
  const gitSha = typeof __GIT_SHA__ === 'string' && __GIT_SHA__.trim() ? __GIT_SHA__.trim() : null
  const gitShaShort = gitSha ? gitSha.slice(0, 7) : null
  const gitShaTitle = gitSha || undefined
  const shouldLinkCommit = !!(repoUrl && gitSha && isLikelyGitSha(gitSha) && repoUrl.includes('github.com/'))
  const commitUrl = shouldLinkCommit ? `${repoUrl.replace(TRAILING_SLASH_REGEX, '')}/commit/${gitSha}` : null

  return (
    <footer className="border-t border-[var(--steel-haze)] bg-[var(--slate-machine)]/60 text-xs text-[var(--dust-tint)]">
      <div className="mx-auto max-w-7xl px-5 py-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3 sm:items-center">
            {repoUrl
              ? (
                  <a
                    href={repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 transition hover:text-[var(--cloud-tint)]"
                  >
                    <GitHubIcon className="h-3.5 w-3.5" />
                    <span>GitHub</span>
                    <span aria-hidden="true" className="opacity-70">↗</span>
                  </a>
                )
              : <span />}

            {(version || gitShaShort) && (
              <span className="tabular-nums">
                {version && (
                  <span className="text-[var(--fog-tint)]">
                    v
                    {version}
                  </span>
                )}
                {gitShaShort && (
                  <>
                    {version ? ' · ' : ''}
                    {commitUrl
                      ? (
                          <a
                            href={commitUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="underline underline-offset-2 transition hover:text-[var(--cloud-tint)]"
                            title={gitShaTitle}
                          >
                            {gitShaShort}
                          </a>
                        )
                      : <span title={gitShaTitle}>{gitShaShort}</span>}
                  </>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            {author
              ? (
                  <div className="inline-flex items-center gap-1.5">
                    <span>Made by</span>
                    {author.url == null
                      ? <span>{author.name}</span>
                      : (
                          <a
                            href={author.url}
                            target="_blank"
                            rel="noreferrer"
                            className="underline underline-offset-2 transition hover:text-[var(--cloud-tint)]"
                          >
                            {author.name}
                          </a>
                        )}
                  </div>
                )
              : <span />}

            <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
              <a
                href="https://cvx.ns03.dev"
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-[var(--cloud-tint)]"
              >
                Convex Vote
              </a>
              <span className="text-[var(--steel-haze)]">·</span>
              <a
                href="https://snapshot.box/#/cvx.eth"
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-[var(--cloud-tint)]"
              >
                Snapshot
              </a>
              <span className="text-[var(--steel-haze)]">·</span>
              <a
                href="https://votium.app"
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-[var(--cloud-tint)]"
              >
                Votium
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
