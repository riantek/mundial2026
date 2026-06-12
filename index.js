const express = require('express')
const axios = require('axios')

const app = express()
const PORT = process.env.PORT || 3000
const API_KEY = process.env.API_KEY || '9c9b4776f4884bc19352fb8ead392642'
const API_LIVE_KEY = process.env.API_LIVE_KEY || '573be67e99eb1de4e2dd0583eda38b71'

const formatICSDate = (dateStr) => {
  const date = new Date(dateStr)
  const peru = new Date(date.getTime() - 5 * 60 * 60 * 1000)
  return peru.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

app.get('/api/partidos', async (req, res) => {
  try {
    const { data } = await axios.get(
      'https://v3.football.api-sports.io/fixtures?league=1&season=2026',
      { headers: { 'x-apisports-key': API_LIVE_KEY } }
    )
    res.setHeader('Access-Control-Allow-Origin', '*')
    const partidos = (data.response ?? []).map(f => ({
      id: f.fixture.id,
      utcDate: f.fixture.date,
      status: f.fixture.status.short === 'FT' ? 'FINISHED' : f.fixture.status.short === '1H' || f.fixture.status.short === '2H' || f.fixture.status.short === 'HT' ? 'IN_PLAY' : f.fixture.status.short === 'HT' ? 'PAUSED' : 'TIMED',
      stage: f.league.round,
      group: f.league.round,
      venue: f.fixture.venue.name + ', ' + f.fixture.venue.city,
      homeTeam: { id: f.teams.home.id, name: f.teams.home.name, shortName: f.teams.home.name },
      awayTeam: { id: f.teams.away.id, name: f.teams.away.name, shortName: f.teams.away.name },
      score: { fullTime: { home: f.goals.home, away: f.goals.away } }
    }))
    res.json(partidos)
  } catch (err) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.json([])
  }
})

app.get('/api/live', async (req, res) => {
  try {
    const { data } = await axios.get(
      'https://v3.football.api-sports.io/fixtures?league=1&season=2026&live=all',
      { headers: { 'x-apisports-key': API_LIVE_KEY } }
    )
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.json(data.response ?? [])
  } catch (err) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.json([])
  }
})

app.get('/api/resultados', async (req, res) => {
  try {
    const { data } = await axios.get(
      'https://v3.football.api-sports.io/fixtures?league=1&season=2026&status=FT',
      { headers: { 'x-apisports-key': API_LIVE_KEY } }
    )
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.json(data.response ?? [])
  } catch (err) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.json([])
  }
})

app.get('/mundial2026.ics', async (req, res) => {
  try {
    const { data } = await axios.get(
      'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
      { headers: { 'X-Auth-Token': API_KEY } }
    )

    console.log('Partidos encontrados:', data.matches ? data.matches.length : 0)
    const partidos = data.matches ?? []

    if (partidos.length === 0) {
      return res.status(200).send('Sin partidos: ' + JSON.stringify(data))
    }

    let ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Mundial FIFA 2026//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Mundial FIFA 2026',
      'X-WR-TIMEZONE:America/Lima',
      'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
      'X-PUBLISHED-TTL:PT6H'
    ]

    partidos.forEach(function(p) {
      const inicio = formatICSDate(p.utcDate)
      const fin = formatICSDate(new Date(new Date(p.utcDate).getTime() + 2 * 60 * 60 * 1000).toISOString())
      const local = p.homeTeam.name || 'Por definir'
      const visita = p.awayTeam.name || 'Por definir'
      const resultado = p.score.fullTime.home != null
        ? p.score.fullTime.home + ' - ' + p.score.fullTime.away
        : 'Por jugar'

      ics = ics.concat([
        'BEGIN:VEVENT',
        'UID:mundial2026-' + p.id + '@fifa',
        'DTSTAMP:' + formatICSDate(new Date().toISOString()),
        'DTSTART:' + inicio,
        'DTEND:' + fin,
        'SUMMARY:' + local + ' vs ' + visita,
        'DESCRIPTION:' + p.stage + ' | ' + p.status + ' | Resultado: ' + resultado,
        'LOCATION:' + (p.venue || 'Por confirmar'),
        'BEGIN:VALARM',
        'TRIGGER:-PT60M',
        'ACTION:DISPLAY',
        'DESCRIPTION:Partido en 1 hora!',
        'END:VALARM',
        'END:VEVENT'
      ])
    })

    ics.push('END:VCALENDAR')

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="mundial2026.ics"')
    res.send(ics.join('\r\n'))

  } catch (err) {
    console.error('ERROR:', err.response ? err.response.data : err.message)
    res.status(500).send('Error: ' + JSON.stringify(err.response ? err.response.data : err.message))
  }
})

app.get('/', function(req, res) {
  res.send('<html><head><title>Mundial FIFA 2026</title><meta charset="utf-8"/></head><body style="font-family:sans-serif;text-align:center;padding:40px;background:#f0f4f8"><h1>Mundial FIFA 2026</h1><p>Hora Peru (UTC-5) - Se actualiza automaticamente cada 6 horas</p><a href="/mundial2026.ics" style="display:inline-block;padding:14px 28px;background:#1a73e8;color:white;border-radius:8px;text-decoration:none;font-size:18px;margin:20px">Descargar / Suscribir calendario</a></body></html>')
})

app.listen(PORT, function() {
  console.log('Servidor corriendo en http://localhost:' + PORT)
})