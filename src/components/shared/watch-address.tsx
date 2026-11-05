import type { PropsWithChildren } from 'react'
import { useSearchParams } from 'react-router'
import { useAccount } from 'wagmi'
import { resolveWatchAddress } from '../../lib/watch-address'

export function WatchAddressPanel() {
  const [params, setParams] = useSearchParams()
  const { address } = useAccount()
  const watch = resolveWatchAddress(params, address)
  return (
    <section className="ui-panel p-4" aria-label="Wallet viewer">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          const value = new FormData(event.currentTarget).get('watch')?.toString().trim() ?? ''
          setParams((current) => {
            const next = new URLSearchParams(current)
            next.set('watch', value)
            return next
          })
        }}
      >
        <label className="min-w-0 flex-1 text-sm">
          Watch an address (read-only)
          <input key={params.get('watch')} name="watch" defaultValue={params.get('watch') ?? ''} placeholder="0x…" spellCheck={false} className="mt-2 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-inset)] px-3 py-2" />
        </label>
        <button type="submit" className="ui-interactive rounded-md border px-3 py-2">Watch address</button>
        {watch.isWatchMode && (
          <button
            type="button"
            className="ui-interactive rounded-md border px-3 py-2"
            onClick={() => setParams((current) => {
              const next = new URLSearchParams(current)
              next.delete('watch')
              return next
            })}
          >
            Return to connected wallet
          </button>
        )}
      </form>
      {watch.isInvalid
        ? <p role="alert" className="mt-3 text-sm text-[var(--color-danger)]">Invalid watch address. Enter a valid EVM wallet address.</p>
        : <WatchAddressStatus address={watch.activeAddress} isWatchMode={watch.isWatchMode} />}
    </section>
  )
}

function WatchAddressStatus({ address, isWatchMode }: PropsWithChildren<{ address?: string, isWatchMode: boolean }>) {
  return (
    <p className="mt-3 break-all text-sm text-[var(--color-text-muted)]">
      {isWatchMode ? 'Read-only watched address: ' : 'Connected wallet: '}
      {address ?? 'No wallet connected'}
    </p>
  )
}
