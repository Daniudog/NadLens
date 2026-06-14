import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-bright)',
      borderRadius: '8px',
      padding: '10px 14px',
      fontFamily: 'var(--font-mono)',
    }}>
      <div style={{ fontSize: '13px', color: 'var(--purple-bright)', fontWeight: 700 }}>
        {payload[0].value.toLocaleString()} TPS
      </div>
      {payload[0].payload.block && (
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
          Block #{payload[0].payload.block?.toLocaleString()}
        </div>
      )}
    </div>
  )
}

export default function TPSChart({ data, loading }) {
  if (loading || !data?.length) {
    return (
      <div style={{
        height: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        fontSize: '12px',
        letterSpacing: '0.1em',
      }}>
        AWAITING DATA...
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="tpsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#836EF9" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#836EF9" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis dataKey="block" hide />
        <YAxis
          tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text-muted)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="tps"
          stroke="#836EF9"
          strokeWidth={2}
          fill="url(#tpsGradient)"
          dot={false}
          activeDot={{ r: 4, fill: '#A78BFA', stroke: 'var(--bg-card)', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
