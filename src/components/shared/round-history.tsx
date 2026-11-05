import type { GaugeRound } from '../../features/proposal/types'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useRoundHistory } from '../../features/proposal/queries'
import { formatDateTime } from '../../lib/format'

export function RoundHistory({ round, dashboard = false }: { round?: GaugeRound | null, dashboard?: boolean }) {
  const query = useRoundHistory()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const watchParams = new URLSearchParams()
  if (params.has('watch'))
    watchParams.set('watch', params.get('watch') ?? '')
  const watchSuffix = watchParams.size ? `?${watchParams}` : ''
  return (
    <section className="ui-panel flex flex-wrap items-center justify-between gap-3 p-4" aria-label="Voting history">
      <div>
        <p className="ui-eyebrow">Voting history</p>
        {round && (
          <p className="mt-2 text-sm">
            {round.state === 'closed' ? 'Closed round · Historical figures · Read-only' : 'Current voting window'}
            {' '}
            ·
            {' '}
            {formatDateTime(round.start)}
            {' '}
            →
            {' '}
            {formatDateTime(round.end)}
          </p>
        )}
        {query.isError && (
          <p role="alert" className="mt-2 text-sm">
            Round history unavailable.
            <button type="button" onClick={() => query.refetch()} className="underline">Retry history</button>
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label>
          Round
          <select
            className="ml-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-inset)] px-3 py-2"
            value={round ? String(round.proposalId) : ''}
            onChange={(event) => {
              const next = new URLSearchParams(params)
              if (dashboard) {
                next.set('round', event.target.value)
                navigate(`/?${next}`)
              }
              else {
                navigate(`/proposal/${event.target.value}?${next}`)
              }
            }}
            disabled={!query.data?.length}
          >
            {!round && <option value="">Select a round</option>}
            {(query.data ?? (round ? [round.proposalId] : [])).map(id => (
              <option key={id} value={id}>
                Round #
                {id}
              </option>
            ))}
          </select>
        </label>
        <Link to={`/${watchSuffix}`} className="underline">Current / latest round</Link>
        {round && <Link to={`/proposal/${round.proposalId}${watchSuffix}`} className="underline">Share this round</Link>}
      </div>
    </section>
  )
}
