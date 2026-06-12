export default async function handler(req, res) {
    // Test coordinates: AB1 Block -> AB2 Block
    const coordinates = [
        [75.564249, 26.842586],
        [75.5661, 26.843117]
    ];

    const apiKey = process.env.ORS_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ 
            error: 'ORS_API_KEY is not set in environment variables',
            env_keys_present: Object.keys(process.env).filter(k => !k.includes('SECRET'))
        });
    }

    try {
        const response = await fetch('https://api.openrouteservice.org/v2/directions/foot-walking/geojson', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ coordinates })
        });

        const text = await response.text();
        let parsed;
        try { parsed = JSON.parse(text); } catch { parsed = text; }

        return res.status(200).json({
            ors_status: response.status,
            ors_ok: response.ok,
            api_key_preview: apiKey.slice(0, 8) + '...',
            ors_response: parsed
        });

    } catch (error) {
        return res.status(500).json({ 
            error: error.message,
            type: 'fetch_failed'
        });
    }
}
