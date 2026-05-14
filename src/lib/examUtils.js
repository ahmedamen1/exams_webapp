function seededShuffle(array, seed) {
  const shuffled = [...array];
  let currentSeed = seed || 1;

  function random() {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  }

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

function nameToSeed(studentName) {
  return [...studentName].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function seededIndex(seed, length) {
  if (!length) {
    return 0;
  }
  const value = (seed * 9301 + 49297) % 233280;
  return Math.floor((value / 233280) * length);
}

export function prepareExam(questions, studentName, mode) {
  const ordered = [...questions].sort((a, b) => a.order - b.order);
  const seed = nameToSeed(studentName);

  const groups = ordered.reduce((map, question) => {
    const key = question.groupKey || String(question.order || map.size + 1);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(question);
    return map;
  }, new Map());

  const selectedQuestions = [...groups.entries()]
    .sort((a, b) => Math.min(...a[1].map((question) => question.order)) - Math.min(...b[1].map((question) => question.order)))
    .map(([key, variants], index) => {
      const sortedVariants = variants.sort((a, b) => a.order - b.order);
      if (mode !== "random" || sortedVariants.length === 1) {
        return sortedVariants[0];
      }
      return sortedVariants[seededIndex(seed + index + key.length, sortedVariants.length)];
    });

  return selectedQuestions.map((question, index) => {
    if (question.type !== "mcq") {
      return question;
    }

    const optionIndices = question.options.map((_, optionIndex) => optionIndex);
    const shuffledIndices = seededShuffle(optionIndices, seed + index + 7);

    return {
      ...question,
      options: shuffledIndices.map((optionIndex) => question.options[optionIndex]),
      correctAnswer: shuffledIndices.indexOf(question.correctAnswer)
    };
  });
}

export function gradeMCQ(questions, answers) {
  return questions.reduce((score, question) => {
    if (question.type === "mcq" && answers[question.id]?.answer === question.correctAnswer) {
      return score + Number(question.marks || 0);
    }
    return score;
  }, 0);
}

export function answeredCount(questions, answers) {
  return questions.filter((question) => {
    const value = answers[question.id]?.answer;
    return value !== undefined && value !== null && String(value).trim() !== "";
  }).length;
}
