const { app } = require("@azure/functions");

app.http("httpTrigger1", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    context.log(`Http function processed request for url "${request.url}"`);

    let imageUrl = request.query.get("url");
    if (!imageUrl && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      imageUrl = body.url;
    }

    if (!imageUrl) {
      return {
        status: 400,
        body: "Please provide an image URL as a query parameter (?url=...) or in the JSON body.",
      };
    }

    const endpoint =
      "https://visionapiforcaptions.cognitiveservices.azure.com/vision/v3.2/describe";
    const apiKey = process.env.VISION_API_KEY;
    if (!apiKey) {
      return {
        status: 500,
        body: "VISION_API_KEY environment variable is not set.",
      };
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: imageUrl }),
      });

      if (!response.ok) {
        throw new Error(
          `Vision API returned status ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      context.log("Vision API response:", data);

      const captions =
        data.description && data.description.captions
          ? data.description.captions.map((caption) => caption.text)
          : [];

      return {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captions }),
      };
    } catch (error) {
      context.log("Error calling Vision API:", error.message);
      return {
        status: 500,
        body: { error: error.message },
      };
    }
  },
});
