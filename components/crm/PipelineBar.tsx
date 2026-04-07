'use client'

const STAGE_COLORS: Record<string, string> = {
  new_lead: 'bg-blue-500',
  waiting_for_response: 'bg-yellow-500',
  engaging: 'bg-orange-500',
  qualified: 'bg-purple-500',
  sketch_received: 'bg-pink-500',
  quote_sent: 'bg-cyan-500',
  choosing_material: 'bg-indigo-500',
  ready_for_templating: 'bg-teal-500',
  default: 'bg-slate-500',
}

const STAGE_LABELS: Record<string, string> = {
  new_lead: 'New Lead',
  waiting_for_response: 'Waiting',
  engaging: 'Engaging',
  qualified: 'Qualified',
  sketch_received: 'Sketch Recv.',
  quote_sent: 'Quote Sent',
  choosing_material: 'Choosing Mat.',
  ready_for_templating: 'Ready',
}

interface PipelineBarProps {
  stageCounts: Record<string, number>
  activeStage?: string | null
  onStageClick: (stage: string | null) => void
}

export default function PipelineBar({ stageCounts, activeStage, onStageClick }: PipelineBarProps) {
  const total = Object.values(stageCounts).reduce((a, b) => a + b, 0)

  if (total === 0) {
    return (
      <div className="text-slate-500 text-sm text-center py-4">No pipeline data available</div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Visual bar */}
      <div className="flex rounded-full overflow-hidden h-3 bg-slate-700">
        {Object.entries(stageCounts).map(([stage, count]) => {
          const pct = (count / total) * 100
          const color = STAGE_COLORS[stage] || STAGE_COLORS.default
          return (
            <div
              key={stage}
              className={`${color} h-full transition-all cursor-pointer hover:opacity-80`}
              style={{ width: `${pct}%` }}
              title={`${STAGE_LABELS[stage] || stage}: ${count}`}
              onClick={() => onStageClick(activeStage === stage ? null : stage)}
            />
          )
        })}
      </div>

      {/* Stage pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onStageClick(null)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            !activeStage
              ? 'bg-amber-500 text-slate-900'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          All ({total})
        </button>
        {Object.entries(stageCounts).map(([stage, count]) => {
          const color = STAGE_COLORS[stage] || STAGE_COLORS.default
          const label = STAGE_LABELS[stage] || stage
          return (
            <button
              key={stage}
              onClick={() => onStageClick(activeStage === stage ? null : stage)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeStage === stage
                  ? `${color} text-white`
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {label} ({count})
            </button>
          )
        })}
      </div>
    </div>
  )
}
