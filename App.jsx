import { useState, useEffect, useMemo } from 'react'
import { D0, RL } from './data.js'

const f = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const pc = (a, b) => (b ? ((a / b) * 100).toFixed(1).replace('.', ',') + '%' : '0%')
const S = a => a.reduce((s, r) => s + r.v, 0)
const NM = { P: 'Paulo', N: 'Natália' }
const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch { return d } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} },
}
const cls = e => { e = e.toUpperCase(); for (const [n, k] of RL) if (k.split('|').some(x => e.includes(x))) return n; return 'Seguro e outros' }

function parse(t) {
  if (t.charCodeAt(0) === 0xfeff) t = t.slice(1)
  const unk = [], out = []
  t.split('\n').filter(x => x.trim()).slice(1).forEach(l => {
    const c = l.split(';').map(s => s.trim().split('"').join(''))
    if (c.length < 4) return
    const e = c[1].split(' ').filter(Boolean).join(' ')
    if (e.toLowerCase().includes('pagamento')) return
    const v = parseFloat(c[3].replace(/[^0-9,-]/g, '').replace(',', '.'))
    if (isNaN(v)) return
    let p = /PAULO/i.test(c[2]) ? 'P' : /NATALIA/i.test(c[2]) ? 'N' : null
    if (!p) { if (!unk.includes(c[2])) unk.push(c[2]); p = unk.indexOf(c[2]) === 0 ? 'P' : 'N' }
    const q = (c[4] || '').trim()
    out.push([cls(e), c[0].slice(0, 5), e, p, Math.round(v * 100) / 100, q === '-' ? '' : q])
  })
  return out
}

function Bar({ k, sub, v, mx, col }) {
  return (
    <div className="br">
      <span>{k}{sub && <small>{sub}</small>}</span>
      <span className="bt"><i style={{ width: (Math.max(v, 0) / mx) * 100 + '%', background: col }} /></span>
      <span className="bv">{f(v)}</span>
    </div>
  )
}

function Dash({ R }) {
  const Pr = R.filter(r => r.p === 'P'), Nr = R.filter(r => r.p === 'N'), T = S(R), P = S(Pr), N = S(Nr)
  const by = a => Object.entries(a.reduce((m, r) => ((m[r.c] = (m[r.c] || 0) + r.v), m), {})).sort((x, y) => y[1] - x[1])
  const all = by(R), mx = Math.max(...all.map(x => x[1]), 1)
  const par = R.filter(r => r.pc).map(r => { const [n, m] = r.pc.split(' de ').map(Number); return { ...r, n, m } })
  const pv = S(par), pP = S(par.filter(r => r.p === 'P')), pN = pv - pP
  const fut = par.reduce((s, r) => s + r.v * (r.m - r.n), 0), nw = par.filter(r => r.n === 1)
  const g = {}
  par.filter(r => r.n < r.m).forEach(r => { const k = r.e + '|' + r.pc; const o = (g[k] = g[k] || { k: r.e, v: 0, s: r.m - r.n + ' parcelas restantes' }); o.v += r.v })
  const fx = R.filter(r => !r.pc && /CONTA VIVO|NETFLIX|SPOTIFY|APPLE|GOOGLE|WELLHUB/.test(r.e.toUpperCase())).map(r => ({ k: r.e, v: r.v, s: 'mensal, sem fim definido' }))
  const rec = [...Object.values(g), ...fx].sort((a, b) => b.v - a.v).slice(0, 8), rm = rec[0] ? rec[0].v : 1
  const tN = by(Nr)[0] || ['sem gastos', 0], tP = by(Pr)[0] || ['sem gastos', 0]
  const mk = all.find(x => x[0].startsWith('Mercado')), fd = S(R.filter(r => /^(Delivery|Bar)/.test(r.c)))
  const sm = R.filter(r => r.v > 0 && r.v < 50 && !r.pc), big = [...R].sort((a, b) => b.v - a.v)[0]
  const pb = (l, a, t, col) => (
    <div className="br"><span>{l}</span><span className="bt"><i style={{ width: (t ? (a / t) * 100 : 0) + '%', background: col }} /></span><span className="bv">{pc(a, t)} parcelado</span></div>
  )
  const top = a => <ul>{[...a].sort((x, y) => y.v - x.v).slice(0, 5).map((r, i) => <li key={i}>{r.e}: <b>{f(r.v)}</b></li>)}</ul>
  const ins = [
    <>Natália concentra o gasto em <b>{tN[0]}</b>: {f(tN[1])}, {pc(tN[1], N)} da fatura dela.</>,
    <>Paulo concentra o gasto em <b>{tP[0]}</b>: {f(tP[1])}, {pc(tP[1], P)} da fatura dele.</>,
    <>{pc(pv, T)} da fatura ({f(pv)}) está parcelada. Há {f(fut)} em parcelas futuras já comprometidas, sem contar compras novas.</>,
    <>Entraram {nw.length} parcelamentos novos nesta fatura, somando {f(S(nw))} por mês. Parcelar compras pequenas mantém a fatura alta.</>,
    mk && <>Mercado, padaria e afins somam {f(mk[1])} ({pc(mk[1], T)}), em {R.filter(r => r.c === mk[0]).length} compras.</>,
    <>Delivery, restaurantes e bar somam {f(fd)} ({pc(fd, T)} da fatura).</>,
    <>{sm.length} compras à vista abaixo de R$ 50 somam {f(S(sm))}: gastos pequenos que passam despercebidos.</>,
    rec[0] && <>O maior gasto recorrente é <b>{rec[0].k}</b>: {f(rec[0].v)} por mês ({rec[0].s}).</>,
    <>A maior compra única foi <b>{big.e}</b>, {f(big.v)}.</>,
  ].filter(Boolean)
  return (
    <>
      <div className="kpis">
        <div className="kpi"><span>Total da fatura</span><b>{f(T)}</b></div>
        <div className="kpi"><span>Paulo ({pc(P, T)})</span><b>{f(P)}</b></div>
        <div className="kpi"><span>Natália ({pc(N, T)})</span><b>{f(N)}</b></div>
        <div className="kpi"><span>Parcelado ({pc(pv, T)})</span><b>{f(pv)}</b></div>
      </div>
      <div className="grid">
        <div className="card full">
          <h2>Gasto por categoria e pessoa</h2>
          <div className="leg"><i style={{ background: 'var(--acc)' }} />Paulo<i style={{ background: 'var(--n)' }} />Natália</div>
          {all.map(([k]) => {
            const p = S(Pr.filter(r => r.c === k)), n = S(Nr.filter(r => r.c === k))
            return (
              <div className="br" key={k}>
                <span>{k}<small className="sp">Paulo {f(p)} · Natália {f(n)}</small></span>
                <span className="bt">
                  <i title={'Paulo: ' + f(p)} style={{ width: (Math.max(p, 0) / mx) * 100 + '%', background: 'var(--acc)' }} />
                  <i title={'Natália: ' + f(n)} style={{ width: (Math.max(n, 0) / mx) * 100 + '%', background: 'var(--n)' }} />
                </span>
                <span className="bv">{f(p + n)}</span>
              </div>
            )
          })}
        </div>
        <div className="card"><h2>Onde a Natália mais gasta</h2>{by(Nr).slice(0, 6).map(([k, v]) => <Bar key={k} k={k} v={v} mx={by(Nr)[0]?.[1] || 1} col="var(--n)" />)}</div>
        <div className="card"><h2>Onde o Paulo mais gasta</h2>{by(Pr).slice(0, 6).map(([k, v]) => <Bar key={k} k={k} v={v} mx={by(Pr)[0]?.[1] || 1} col="var(--acc)" />)}</div>
        <div className="card full"><h2>Maiores gastos recorrentes</h2>{rec.map((o, i) => <Bar key={i} k={o.k} sub={o.s} v={o.v} mx={rm} col="var(--acc)" />)}</div>
        <div className="card"><h2>Parcelado por pessoa</h2>{pb('Paulo', pP, P, 'var(--acc)')}{pb('Natália', pN, N, 'var(--n)')}</div>
        <div className="card"><h2>Maiores lançamentos</h2><b>Natália</b>{top(Nr)}<b>Paulo</b>{top(Pr)}</div>
        <div className="card full"><h2>Insights</h2><ul>{ins.map((t, i) => <li key={i}>{t}</li>)}</ul></div>
      </div>
    </>
  )
}

export default function App() {
  const [D, setD] = useState(() => ls.get('imp', null) || D0)
  const [fname, setFname] = useState(() => ls.get('impn', ''))
  const [ov, setOv] = useState(() => ls.get('ov', {}))
  const [custom, setCustom] = useState(() => ls.get('cc', []))
  const [tab, setTab] = useState('cat')
  const [flt, setFlt] = useState('')
  const [open, setOpen] = useState(new Set())
  const [msg, setMsg] = useState('')
  const [nc, setNc] = useState('')
  useEffect(() => ls.set('ov', ov), [ov])
  useEffect(() => ls.set('cc', custom), [custom])

  const R = useMemo(() => D.map((r, i) => ({ c: ov[i] ?? r[0], d: r[1], e: r[2], p: r[3], v: r[4], pc: r[5], i })), [D, ov])
  const cats = useMemo(() => [...new Set([...D.map(r => r[0]), ...custom])].sort((a, b) => a.localeCompare(b, 'pt-BR')), [D, custom])
  const rows = R.filter(r => !flt || r.p === flt)
  const groups = {}
  rows.forEach(r => (groups[r.c] = groups[r.c] || []).push(r))
  const names = Object.keys(groups).sort((a, b) => S(groups[b]) - S(groups[a]))
  const T = S(rows), nov = Object.keys(ov).length

  const move = (i, c) => {
    setOv(o => { const n = { ...o }; if (c === D[i][0]) delete n[i]; else n[i] = c; return n })
    setOpen(s => new Set(s).add(c))
  }
  const tog = (c, v) => setOpen(s => { if (s.has(c) === v) return s; const n = new Set(s); v ? n.add(c) : n.delete(c); return n })
  const load = file => {
    const rd = new FileReader()
    rd.onload = () => {
      const r = parse(String(rd.result))
      if (!r.length) return setMsg('Não encontrei lançamentos. Use o formato Data;Estabelecimento;Portador;Valor;Parcela.')
      setD(r); setOv({}); setFname(file.name); ls.set('imp', r); ls.set('impn', file.name)
      setMsg(`${r.length} lançamentos importados, total ${f(r.reduce((s, x) => s + x[4], 0))}.`)
    }
    rd.readAsText(file, 'utf-8')
  }
  const orig = () => {
    setD(D0); setOv({}); setFname(''); setMsg('')
    try { localStorage.removeItem('imp'); localStorage.removeItem('impn') } catch {}
  }

  return (
    <main>
      <h1>{fname ? `Fatura importada: ${fname}` : 'Fatura de 20/10/2026'}</h1>
      <p className="sub">Paulo e Natália. Os gráficos refletem as reclassificações feitas na guia de categorias.</p>
      <div className="bar">
        <label className="fb">Importar CSV
          <input type="file" accept=".csv,text/csv,text/plain" hidden onChange={e => { const fl = e.target.files[0]; if (fl) load(fl); e.target.value = '' }} />
        </label>
        <button onClick={orig}>Fatura original</button>
        <span id="imsg">{msg}</span>
      </div>
      <nav className="tabs" role="tablist">
        {[['cat', 'Despesas por categoria'], ['dash', 'Dashboard']].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>
        ))}
      </nav>
      {tab === 'dash' ? <Dash R={R} /> : (
        <>
          <p className="sub">Toque em uma categoria para ver os lançamentos. Use a coluna “Mover para” para reclassificar.</p>
          <div className="bar">
            <button onClick={() => setOpen(new Set(names))}>Expandir tudo</button>
            <button onClick={() => setOpen(new Set())}>Recolher tudo</button>
            {[['', 'Todos'], ['P', 'Paulo'], ['N', 'Natália']].map(([k, l]) => (
              <button key={k} aria-pressed={flt === k} onClick={() => setFlt(k)}>{l}</button>
            ))}
          </div>
          <div className="bar">
            <input value={nc} onChange={e => setNc(e.target.value)} placeholder="Nova categoria" aria-label="Nome da nova categoria" />
            <button onClick={() => { const v = nc.trim(); if (v && !cats.includes(v)) setCustom(c => [...c, v]); setNc('') }}>Criar categoria</button>
            <button onClick={() => setOv({})}>Restaurar original</button>
            <span id="chgn">{nov ? `${nov} ${nov > 1 ? 'lançamentos reclassificados' : 'lançamento reclassificado'}` : ''}</span>
          </div>
          <div className="head" aria-hidden="true"><span>Categoria</span><span className="num hide">Paulo</span><span className="num hide">Natália</span><span className="num">Total</span><span className="num hide">%</span></div>
          {names.map(c => {
            const a = groups[c], p = S(a.filter(r => r.p === 'P')), n = S(a.filter(r => r.p === 'N'))
            return (
              <details key={c} open={open.has(c)} onToggle={e => tog(c, e.currentTarget.open)}>
                <summary>
                  <span className="nm">{c} <span className="cnt">({a.length})</span></span>
                  <span className="num hide">{f(p)}</span><span className="num hide">{f(n)}</span>
                  <span className="num">{f(S(a))}</span><span className="num hide">{pc(S(a), T)}</span>
                </summary>
                <div className="tw">
                  <table>
                    <thead><tr><th>Data</th><th>Estabelecimento</th><th>Portador</th><th>Parcela</th><th className="num">Valor</th><th>Mover para</th></tr></thead>
                    <tbody>
                      {[...a].sort((x, y) => y.v - x.v).map(r => (
                        <tr key={r.i} className={ov[r.i] !== undefined ? 'chg' : ''}>
                          <td>{r.d}</td><td>{r.e}</td><td>{NM[r.p]}</td><td>{r.pc || 'À vista'}</td>
                          <td className={'num' + (r.v < 0 ? ' neg' : '')}>{f(r.v)}</td>
                          <td><select value={r.c} aria-label={`Mover ${r.e} para outra categoria`} onChange={e => move(r.i, e.target.value)}>{cats.map(x => <option key={x}>{x}</option>)}</select></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )
          })}
          <div className="tot">
            <div className="head">
              <span>Total ({rows.length} lançamentos)</span>
              <span className="num hide">{f(S(rows.filter(r => r.p === 'P')))}</span>
              <span className="num hide">{f(S(rows.filter(r => r.p === 'N')))}</span>
              <span className="num">{f(T)}</span><span className="num hide">100%</span>
            </div>
          </div>
        </>
      )}
    </main>
  )
}
