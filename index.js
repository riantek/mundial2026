const express = require('express')
const axios = require('axios')

const app = express()
const PORT = 3000
const API_KEY = '9c9b4776f4884bc19352fb8ead392642'

const formatICSDate = (dateStr) => {
  const date = new Date(dateStr)
  const peru = new Date(date.getTime() - 5 * 60 * 60 * 1000)
  return peru.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

app.get('/mundial2026.ics', async (req, res) => {
  try {
    const { data } = await axios.get(
      'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
      {
        headers: {
          'X-Auth-Token': API_KEY
        }
      }
    )

    console.log('Partidos encontrados:', data.matches?.length ?? 0)

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
      'X-WR-CALNAME:⚽ Mundial FIFA 2026',
      'X-WR-TIMEZONE:America/Lima',
      'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
      'X-PUBLISHED-TTL:PT6H',
    ]

    partidos.forEach((p) => {
      const inicio   = formatICSDate(p.utcDate)
      const fin      = formatICSDate(new Date(new Date(p.utcDate).getTime() + 2 * 60 * 60 * 1000).toISOString())
      const local    = p.homeTeam.name ?? 'Por definir'
      const visita   = p.awayTeam.name ?? 'Por definir'
      const resultado = p.score.fullTime.home != null
        ? `${p.score.fullTime.home} - ${p.score.fullTime.away}`
        : 'Por jugar'

      ics = ics.concat([
        'BEGIN:VEVENT',
        `UID:mundial2026-${p.id}@fifa`,
        `DTSTAMP:${formatICSDate(new Date().toISOString())}`,
        `DTSTART:${inicio}`,
        `DTEND:${fin}`,
        `SUMMARY:⚽ ${local} vs ${visita}`,
        `DESCRIPTION:${p.stage} | ${p.status} | Resultado: ${resultado}`,
        `LOCATION:${p.venue ?? 'Por confirmar'}`,
        'BEGIN:VALARM',
        'TRIGGER:-PT60M',
        'ACTION:DISPLAY',
        'DESCRIPTION:¡Partido en 1 hora!',
        'END:VALARM',
        'END:VEVENT',
      ])
    })

    ics.push('END:VCALENDAR')

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="mundial2026.ics"')
    res.send(ics.join('\r\n'))

  } catch (err) {
    console.error('ERROR:', err.response?.data ?? err.message)
    res.status(500).send('Error: ' + JSON.stringify(err.response?.data ?? err.message))
  }
})

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Mundial FIFA 2026</title><meta charset="utf-8"/></head>
      <body style="font-family:sans-serif;text-align:center;padding:40px;background:#f0f4f8">
        <h1>⚽ Calendario Mundial FIFA 2026</h1>
        <p>Hora Perú (UTC-5) · Se actualiza automáticamente cada 6 horas</p>
        <a href="/mundial2026.ics" style="display:inline-block;padding:14px 28px;background:#1a73e8;color:white;border-radius:8px;text-decoration:none;font-size:18px;margin:20px">
          📅 Descargar / Suscribir calendario
        </a>
        <div style="margin-top:30px;color:#444;font-size:14px;max-width:500px;margin:30px auto">
          <b>¿Cómo suscribirte?</b><br/><br/>
          📱 <b>iOS:</b> Ajustes → Calendario → Cuentas → Otro → Calendario suscrito<br/><br/>
          📅 <b>Google Calendar:</b> Otros calendarios → + → Desde URL<br/><br/>
          💻 <b>Outlook:</b> Agregar calendario → Desde Internet
        </div>
      </body>
    </html>
  `)
})

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`)
})