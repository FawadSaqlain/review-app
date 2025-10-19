// lib/commentSummarizer.js
// Shared local summarizer used by ratingApiController and test scripts
function summarizeComments(comments, avgOverall = 0, avgMarks = 0) {
  if (!comments || comments.length === 0) return { summary: 'No comments available.', avgOverall, avgMarks, count: 0 };
  try {
    const text = comments.join(' ');
    const lc = text.toLowerCase();

    // Collect candidate keywords (words >=3 letters, remove simple stopwords)
    const words = (lc.match(/\b[a-z]{3,}\b/g) || []);
    const stopwords = new Set(['the','and','for','with','that','this','have','has','was','were','been','are','but','not','you','your','from','they','their','them','what','when','where','who','which','there','about','also','very','can','just','our','will','would','could','should','each','course','teacher','class','lecture']);
    const freq = Object.create(null);
    for (const w of words) {
      if (stopwords.has(w)) continue;
      freq[w] = (freq[w] || 0) + 1;
    }
    const keywords = Object.keys(freq).sort((a,b) => freq[b]-freq[a]).slice(0,6);

    // Simple polarity counts using small lexicons
    const positive = ['good','great','useful','helpful','clear','excellent','easy','enjoy','liked','awesome','well','friendly'];
    const negative = ['bad','poor','difficult','confusing','late','slow','hard','problem','boring','fail','unsatisfactory','issue','issues','unresponsive'];
    let posCount = 0, negCount = 0;
    for (const c of comments) {
      const lcC = c.toLowerCase();
      if (positive.some(p => lcC.includes(p))) posCount++;
      if (negative.some(n => lcC.includes(n))) negCount++;
    }

    // Pick 1-2 representative comments and quote them
    const examples = comments.slice(0,2).map(c => c.replace(/\s+/g, ' ').trim()).map(c => c.length > 200 ? c.slice(0,200) + '...' : c);

    // Build a clear multi-sentence paragraph
    const total = comments.length;
    const posPct = Math.round((posCount / total) * 100);
    const negPct = Math.round((negCount / total) * 100);
    const theme = keywords.length ? keywords.slice(0,3).join(', ') : null;

    const sentences = [];
    sentences.push(`Summary (based on ${total} comment(s)): average overall ${avgOverall.toFixed(2)}, average marks ${avgMarks.toFixed(2)}.`);
    if (theme) sentences.push(`Common topics mentioned include: ${theme}.`);
    if (posCount > 0 || negCount > 0) sentences.push(`Approximately ${posPct}% positive mentions and ${negPct}% negative/concern mentions among comments.`);
    if (examples.length) {
      const q = examples.map(e => `"${e}"`).join(' — ');
      sentences.push(`Representative comments: ${q}`);
    }

    const summaryText = sentences.join(' ');
    return { summary: summaryText, avgOverall, avgMarks, count: total };
  } catch (e) {
    const fallback = comments.slice(0,5).map((c,i)=>`${i+1}. ${c.length>200?c.slice(0,200)+'...':c}`).join('\n');
    return { summary: fallback, avgOverall, avgMarks, count: comments.length };
  }
}

module.exports = { summarizeComments };
