export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { coordinates } = req.body;

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
        return res.status(400).json({ error: 'Invalid coordinates. Provide an array of at least 2 [lon, lat] pairs.' });
    }

    try {
        const response = await fetch('https://api.openrouteservice.org/v2/directions/foot-walking/geojson', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + process.env.ORS_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ coordinates })
        });

        if (!response.ok) {
            const errBody = await response.json().catch(() => ({}));
            const message = errBody?.error?.message || errBody?.message || `ORS API responded with ${response.status}`;
            console.error("ORS Error:", response.status, message);
            return res.status(response.status).json({ error: message });
        }

        const data = await response.json();
        return res.status(200).json(data);

    } catch (error) {
        console.error("Routing Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
