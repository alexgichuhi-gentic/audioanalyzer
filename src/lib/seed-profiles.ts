import { prisma } from './prisma';

const DEFAULT_PROFILES = [
  {
    name: 'Sales Call - Booking Check',
    description: 'Analyze a business-customer call. Shows at a glance: what they discussed, key details, and whether a visit/appointment was booked.',
    isDefault: true,
    isSystem: true,
    promptTemplate: `You are an expert sales call analyst. This is a recorded phone call between a business owner (or their staff) and a customer.

Your #1 job is to figure out: did they settle on a visit, appointment, or booking?

## Transcript
{{transcript}}

## Call Info
- Duration: {{duration}}
- Date: {{date}}

## Instructions
Produce EXACTLY this format in Markdown. Keep it scannable - a busy person should get the picture in 10 seconds.

### BOOKING STATUS
Start with one of these in bold:
- **BOOKED** - if a specific date/time was agreed upon
- **TENTATIVE** - if they discussed a visit but nothing confirmed
- **NO BOOKING** - if no appointment was made
- **CALLBACK** - if they agreed to call back or follow up later

If booked or tentative, state:
- Date & time of the appointment
- Type of visit/service
- Location (if mentioned)

### QUICK SUMMARY
2-3 sentences maximum. What was this call about? What was the outcome?

### KEY DETAILS
Bullet list of the important specifics mentioned:
- Customer name (if mentioned)
- Service or product discussed
- Pricing or quotes mentioned
- Special requests or requirements
- Any concerns raised by the customer

### MAIN TALKING POINTS
Bullet list of the major topics covered during the call, in the order they came up.

### CUSTOMER SENTIMENT
One line: Was the customer interested, hesitant, satisfied, frustrated, etc.?

### FOLLOW-UP NEEDED
- Any promises made that need to be kept
- Any unanswered questions
- Next steps (if any)

Also output a JSON block at the end:
\`\`\`json
{
  "booking_status": "booked|tentative|no_booking|callback",
  "appointment_date": "date if mentioned or null",
  "appointment_time": "time if mentioned or null",
  "service_type": "what service/visit was discussed",
  "customer_name": "name if mentioned or null",
  "price_mentioned": "price/quote if mentioned or null",
  "customer_sentiment": "interested|hesitant|satisfied|frustrated|neutral",
  "follow_up_required": true,
  "call_outcome": "one sentence summary"
}
\`\`\``,
  },
  {
    name: 'Sales Call - Quick Glance',
    description: 'Ultra-short summary: booking status, what was discussed, and next steps.',
    isDefault: false,
    isSystem: true,
    promptTemplate: `This is a business-customer phone call. Give me the shortest possible summary.

## Transcript
{{transcript}}

## Instructions
Respond with ONLY these three things:

### BOOKING: [BOOKED / TENTATIVE / NO BOOKING / CALLBACK]
If booked: state the date, time, and what for.

### WHAT THEY DISCUSSED
Maximum 3 bullet points.

### NEXT STEPS
Maximum 2 bullet points. If none, say "None."

Keep the entire response under 150 words. No fluff.

\`\`\`json
{
  "booking_status": "booked|tentative|no_booking|callback",
  "appointment_date": "date or null",
  "appointment_time": "time or null",
  "service_type": "what for",
  "customer_name": "name or null",
  "price_mentioned": "price or null",
  "customer_sentiment": "neutral",
  "next_steps": ["step1", "step2"]
}
\`\`\``,
  },
  {
    name: 'Sales Call - Detailed Review',
    description: 'Full deep-dive with buying signals, staff performance, and recommendations.',
    isDefault: false,
    isSystem: true,
    promptTemplate: `You are a sales coach analyzing a recorded call between a business and a customer.

## Transcript
{{transcript}}

## Call Info
- Duration: {{duration}}
- Date: {{date}}

## Instructions
Produce a detailed analysis:

### BOOKING STATUS
**BOOKED** / **TENTATIVE** / **NO BOOKING** / **CALLBACK**
Date, time, and service details if applicable.

### CALL SUMMARY
3-5 sentence overview of the entire call.

### KEY DETAILS
All important specifics:
- Customer name and contact info (if mentioned)
- Service/product discussed
- Pricing, quotes, or estimates given
- Special requests or conditions
- Scheduling preferences

### CUSTOMER JOURNEY
- What prompted the call (how did they hear about the business?)
- What questions did the customer ask?
- What concerns or objections did they raise?
- Were the concerns addressed?

### BUYING SIGNALS
- Positive signals (interest, urgency, asking about availability)
- Negative signals (price objection, hesitation, comparing competitors)

### STAFF PERFORMANCE
- Was the staff member helpful and professional?
- Did they ask the right questions?
- Did they attempt to close the booking?
- Missed opportunities

### RECOMMENDATIONS
What should the business do differently next time?

\`\`\`json
{
  "booking_status": "booked|tentative|no_booking|callback",
  "appointment_date": "date or null",
  "appointment_time": "time or null",
  "service_type": "what service",
  "customer_name": "name or null",
  "customer_source": "how they found the business or null",
  "price_mentioned": "price or null",
  "customer_sentiment": "interested|hesitant|satisfied|frustrated|neutral",
  "objections": ["objection1", "objection2"],
  "buying_signals": ["signal1", "signal2"],
  "staff_rating": "excellent|good|average|poor",
  "booking_attempt_made": true,
  "follow_up_required": true
}
\`\`\``,
  },
  {
    name: 'Lead Conversion Coach',
    description: 'Score the call handler\'s performance (out of 80) and get specific tips to convert more leads.',
    isDefault: false,
    isSystem: true,
    promptTemplate: `You are a lead conversion coach for small businesses. This is a recorded call between a business (staff/owner) and a potential customer (lead). Evaluate how well the business handled the call and provide specific coaching.

## Transcript
{{transcript}}

## Call Info
- Duration: {{duration}}
- Date: {{date}}

## Instructions
Be direct and specific. Don't sugarcoat.

### RESULT
One line: **CONVERTED** (booking made), **LOST** (customer didn't book), or **PENDING** (follow-up needed).

### CONVERSION SCORECARD
Rate each of these 1-10 and explain briefly:

| Skill | Score | Why |
|-------|-------|-----|
| First impression & greeting | /10 | |
| Asking discovery questions | /10 | |
| Listening to customer needs | /10 | |
| Presenting value (not just price) | /10 | |
| Handling objections | /10 | |
| Creating urgency | /10 | |
| Asking for the booking | /10 | |
| Overall professionalism | /10 | |

**OVERALL SCORE: X/80**

### WHAT THEY DID WELL
Bullet list of specific things done right.

### WHAT THEY MISSED
Bullet list of missed opportunities with:
- What happened
- What they should have said instead
- Example script for next time

### TOP 3 IMPROVEMENTS
Three highest-impact changes to convert more calls.

### OBJECTION HANDLING REVIEW
Every objection raised:
- What the customer said
- How the staff responded
- A better response

### RED FLAGS
Flag if present: letting customer lead, giving price before value, not asking for the booking, being passive, long silences, not capturing contact info.

### SCRIPT SUGGESTIONS
Write 2-3 short scripts for: strong opening, transition to close, response to "I'll think about it."

\`\`\`json
{
  "booking_status": "booked|tentative|no_booking|callback",
  "customer_name": "name or null",
  "price_mentioned": "price or null",
  "customer_sentiment": "interested|hesitant|satisfied|frustrated|neutral",
  "service_type": "what service",
  "call_result": "converted|lost|pending",
  "overall_score": 0,
  "red_flags": ["flag1", "flag2"],
  "top_improvement": "single most impactful change"
}
\`\`\``,
  },
  {
    name: 'Custom Template',
    description: 'A blank template you can customize. Uses {{transcript}}, {{language}}, {{duration}}, {{date}}.',
    isDefault: false,
    isSystem: false,
    promptTemplate: `Analyze the following transcript and provide your insights.

## Transcript
{{transcript}}

## Context
- Language: {{language}}
- Duration: {{duration}}
- Date: {{date}}

## Your Analysis
Please provide a comprehensive analysis covering:
1. Main topics and themes
2. Key findings or conclusions
3. Any recommendations

Format your response in clear Markdown with headers and bullet points.

Also include a JSON block with structured data:
\`\`\`json
{
  "booking_status": null,
  "customer_name": null,
  "price_mentioned": null,
  "customer_sentiment": "neutral",
  "service_type": null,
  "summary": "one line summary"
}
\`\`\``,
  },
];

export async function seedProfiles() {
  const count = await prisma.analysisProfile.count();
  if (count > 0) return;

  for (const profile of DEFAULT_PROFILES) {
    await prisma.analysisProfile.create({ data: profile });
  }
}
