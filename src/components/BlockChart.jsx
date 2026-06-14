import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-bright)',
      borderRadius: '8px',
      padding: '10px 14px',
      fontFamily: 'var(--font-mono)',
      fontSize: '12px',
    }}>
      <div style={{ color: 'var(--purple-bright)', fontWeight: 700, marginBottom: '4px' }}>
        Block #{d.number?.toLocaleString()}
      </div>
      <div style={{ color: 'var(--text-secondary)' }}>{d.txCount} txns</div>
      <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
        Gas: {d.utilization?.toFixed(1)}%
      </div>
    </div>
  )
}

export default function BlockChart({ data, loading }) {
  if (loading || !data?.length) {
    return (
      <div style={{
        height: '160px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        fontSize: '12px',
        letterSpacing: '0.1em',
      }}>
        AWAITING BLOCKS...
      </div>
    )
  }

  const chartData = data.map(b => ({
    ...b,
    utilization: b.gasLimit > 0 ? (b.gasUsed / b.gasLimit) * 100 : 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barCategoryGap="20%">
        <XAxis dataKey="number" hide />
        <YAxis
          domain={[0, 100]}
          tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text-muted)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `${v}%`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(131,110,249,0.06)' }} />
        <Bar dataKey="utilization" radius={[3, 3, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell
              key={i}
              fill={
                entry.utilization > 80 ? '#A78BFA' :
                entry.utilization > 50 ? '#836EF9' :
                'rgba(131,110,249,0.4)'
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
