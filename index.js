const express = require("express");
const cors = require("cors");
const OpenAI = require("openai").default;

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/api/analyze", async function(req, res) {
  try {
    const description = req.body.description;
    const experienceLevel = req.body.experienceLevel;
    const mode = req.body.mode;

    const levelContext = {
      "Junior Engineer": "Explain clearly. Avoid heavy jargon. Include safety reminders.",
      "Shift Engineer": "Use standard steel plant terminology. Concise and action-oriented.",
      "Senior Engineer": "Advanced technical language. Apply 5-Why, Fishbone, FMEA. Reference ISO codes.",
    };

    const modeRules = {
      "Breakdown": "RAPID MODE: maximum 3 items per section. 1 sentence each.",
      "Deep RCA": "DEEP RCA MODE: 5 items per section. Use 5-Why reasoning.",
    };

    const systemPrompt = "You are MAINTENANCE NINJA, an expert AI for steel plant maintenance.\n\n" +
      "ROLLING MILL: Roughing mill, finishing mill stands, pinch rolls, loopers, coiler, descaler. " +
      "Failures: roll breakage, cobble, bearing temperature rise, mill chatter, AGC faults.\n\n" +
      "CCM: Ladle turret, tundish, SEN, mould, oscillation drive, segments, withdrawal unit. " +
      "Failures: mould level fluctuation, breakout, SEN breakage, segment bearing failure.\n\n" +
      "HYDRAULICS: AGC cylinders, servo valves, accumulators, HPU, filters. " +
      "Failures: pump cavitation, servo valve contamination, cylinder seal leak, overheating.\n\n" +
      "EOT CRANE: Long travel, cross travel, hoisting, VFD panel, electromagnetic brake. " +
      "Failures: brake lining wear, rope fraying, VFD fault, coupling misalignment.\n\n" +
      "Experience Level: " + (levelContext[experienceLevel] || levelContext["Shift Engineer"]) + "\n" +
      "Analysis Mode: " + (modeRules[mode] || modeRules["Breakdown"]) + "\n\n" +
      "RULES:\n" +
      "- probableCauses MUST start with emoji: 🔴 MOST LIKELY: or 🟡 POSSIBLE: or 🟢 CHECK:\n" +
      "- Be specific to steel plant equipment only\n" +
      "- Never invent OEM specs\n\n" +
      "Respond ONLY with valid JSON:\n" +
      "{\n" +
      '  "summary": "2 sentences about equipment, symptom and most likely cause.",\n' +
      '  "probableCauses": ["🔴 MOST LIKELY: cause - reason", "🟡 POSSIBLE: cause - reason", "🟢 CHECK: cause - reason"],\n' +
      '  "checksToConfirm": ["check 1", "check 2", "check 3"],\n' +
      '  "immediateCorrectiveActions": ["Immediate: action", "Permanent: action", "SAFETY: note"],\n' +
      '  "preventiveMeasures": ["PM task 1 - frequency: interval", "PM task 2 - frequency: interval"]\n' +
      "}";

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 2000,
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Analyze this steel plant breakdown:\n\n" + description }
      ],
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    res.json({
      summary: parsed.summary || "",
      probableCauses: parsed.probableCauses || [],
      checksToConfirm: parsed.checksToConfirm || [],
      immediateCorrectiveActions: parsed.immediateCorrectiveActions || [],
      preventiveMeasures: parsed.preventiveMeasures || [],
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Analysis failed: " + err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
  console.log("Maintenance Ninja API running on port " + PORT);
});
