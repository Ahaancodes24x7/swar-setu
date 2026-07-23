export async function getAIPrediction(payload: any) {
  try {
    const res = await fetch("http://127.0.0.1:5000/api/assess", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("AI API error:", err);
    return null;
  }
}