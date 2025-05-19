document.addEventListener('DOMContentLoaded', function() {
  let currentTitle = '';
  let currentContent = '';
  let currentUrl = '';
  let currentLanguage = '';
  let lastParsed = null;
  let lastRawAI = '';

  // Tab switching logic
  const tabs = document.querySelectorAll('.tab');
  const tabContents = {
    solution: document.getElementById('tab-solution'),
    explanation: document.getElementById('tab-explanation'),
    problem: document.getElementById('tab-problem'),
  };
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      Object.keys(tabContents).forEach(key => tabContents[key].classList.remove('active'));
      tabContents[tab.dataset.tab].classList.add('active');
    });
  });

  // Raw AI response toggle
  const rawBtn = document.getElementById('toggleRawBtn');
  const rawPre = document.getElementById('rawAIResponse');
  rawBtn.onclick = function() {
    if (rawPre.style.display === 'none') {
      rawPre.style.display = 'block';
      rawBtn.textContent = 'Hide Raw AI Response';
    } else {
      rawPre.style.display = 'none';
      rawBtn.textContent = 'Show Raw AI Response';
    }
  };

  // Footer navigation (disabled, but UI present)
  document.getElementById('prevBtn').onclick = () => {};
  document.getElementById('nextBtn').onclick = () => {};

  // Get the current active tab
  chrome.tabs.query({active: true, currentWindow: true}, function(tabsArr) {
    const currentTab = tabsArr[0];
    currentUrl = currentTab.url;
    if (currentTab.url.includes('leetcode.com/problems/')) {
      document.getElementById('leetcodeLink').href = currentTab.url;
      chrome.scripting.executeScript({
        target: {tabId: currentTab.id},
        function: extractQuestionTitleContentAndLanguage
      }, (results) => {
        if (chrome.runtime.lastError) {
          showError('Error: ' + chrome.runtime.lastError.message);
          return;
        }
        const result = results[0].result;
        if (result.error) {
          showError(result.error);
        } else {
          currentTitle = result.title;
          currentContent = result.content;
          currentLanguage = result.language;
          displayTitle(currentTitle);
          // Auto-fetch answer on popup open (no loading text)
          fetchAndDisplayAnswer(currentTitle, currentContent, currentLanguage, false);
          // Set up button to re-fetch on click (show loading text)
          const sendBtn = document.getElementById('sendToDeepSeek');
          if (sendBtn) {
            sendBtn.onclick = () => fetchAndDisplayAnswer(currentTitle, currentContent, currentLanguage, true);
          }
          // Fill Problem tab
          fillProblemTab(currentContent);
        }
      });
    } else {
      showError('Please navigate to a LeetCode problem page');
    }
  });
});

function extractQuestionTitleContentAndLanguage() {
  try {
    const titleElement = document.querySelector('.text-title-large a');
    if (!titleElement) {
      return { error: 'Could not find question title' };
    }
    const title = titleElement.textContent.trim();
    const contentElement = document.querySelector('div[data-track-load="description_content"]');
    const content = contentElement ? contentElement.innerText.trim() : '';
    // Extract language from code editor
    let language = '';
    const langButton = document.querySelector('.flexlayout__tab .rounded.items-center.whitespace-nowrap.inline-flex');
    if (langButton) {
      language = langButton.childNodes[0]?.textContent?.trim() || '';
    }
    return { title, content, language };
  } catch (error) {
    return { error: 'Error extracting question: ' + error.message };
  }
}

function displayTitle(title) {
  document.getElementById('questionTitle').textContent = title;
}

function fillProblemTab(content) {
  const tab = document.getElementById('tab-problem');
  tab.innerHTML = '';
  if (content) {
    tab.innerHTML = `<div style="white-space:pre-line; font-size:14px; color:#444;">${escapeHtml(content)}</div>`;
  } else {
    tab.innerHTML = '<i style="color:#888;">No problem description found.</i>';
  }
}

function fetchAndDisplayAnswer(title, content, language, showLoading) {
  const loadingElem = document.getElementById('loadingText');
  const errorElem = document.getElementById('errorMessage');
  const rawPre = document.getElementById('rawAIResponse');
  errorElem.style.display = 'none';
  if (showLoading) {
    loadingElem.style.display = 'block';
    loadingElem.textContent = 'Loading...';
  } else {
    loadingElem.style.display = 'none';
  }

  // Improved prompt with language
  const userMessage = `Please provide the following for the LeetCode problem titled '${title}':\n\nThe user will be coding in: ${language || 'the most suitable language'}\n\n1. The complete solution code in this language, in a code block.\n2. A brief explanation, starting with 'Explanation:'.\n3. The time complexity, starting with 'Time Complexity:'.\n4. The space complexity, starting with 'Space Complexity:'.\n\nFormat your response exactly as above.\n\nProblem Description:\n${content}`;

  const payload = {
    model: "deepseek/deepseek-r1-zero:free",
    messages: [
      {
        role: "user",
        content: userMessage
      }
    ]
  };

  const apiKey = "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";
  const referer = "";
  const siteTitle = "";

  fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": referer,
      "X-Title": siteTitle,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  })
    .then(response => response.json())
    .then(data => {
      loadingElem.style.display = 'none';
      // Parse and format the AI response
      const aiContent = data.choices?.[0]?.message?.content || JSON.stringify(data, null, 2);
      lastRawAI = aiContent;
      document.getElementById('rawAIResponse').textContent = aiContent;
      const parsed = parseAIResponse(aiContent);
      lastParsed = parsed;
      fillSolutionTab(parsed);
      fillExplanationTab(parsed);
    })
    .catch(err => {
      loadingElem.style.display = 'none';
      errorElem.textContent = 'Error: ' + err.message;
      errorElem.style.display = 'block';
    });
}

function fillSolutionTab(parsed) {
  const tab = document.getElementById('tab-solution');
  tab.innerHTML = '';
  // Code block with copy button
  if (parsed.code) {
    const codeFrame = document.createElement('div');
    codeFrame.className = 'code-block';
    const codeBlock = document.createElement('pre');
    codeBlock.style.margin = 0;
    codeBlock.innerHTML = `<code>${escapeHtml(parsed.code)}</code>`;
    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy';
    copyBtn.className = 'copy-btn';
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(parsed.code);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => (copyBtn.textContent = 'Copy'), 1200);
    };
    codeFrame.appendChild(codeBlock);
    codeFrame.appendChild(copyBtn);
    tab.appendChild(codeFrame);
  }
  // Time/Space Complexity
  const row = document.createElement('div');
  row.className = 'complexity-row';
  row.innerHTML = `
    <div><span class="complexity-label">Time Complexity:</span><span class="complexity-value">${parsed.time || '-'}</span></div>
    <div><span class="complexity-label">Space Complexity:</span><span class="complexity-value">${parsed.space || '-'}</span></div>
  `;
  tab.appendChild(row);
}

function fillExplanationTab(parsed) {
  const tab = document.getElementById('tab-explanation');
  tab.innerHTML = '';
  if (parsed.explanation && parsed.explanation.replace(/\\boxed\\{|\\boxed\{|[{}\s]/g, '').length > 0) {
    tab.innerHTML = `<div style="background:#fffbe6; border:1px solid #ffe58f; border-radius:6px; padding:12px; color:#ad6800; margin-bottom:10px;"><b>Explanation:</b><br>${escapeHtml(parsed.explanation).replace(/\n/g, '<br>')}</div>`;
  } else {
    tab.innerHTML = `<div style="background:#fffbe6; border:1px solid #ffe58f; border-radius:6px; padding:12px; color:#ad6800; margin-bottom:10px;"><b>Explanation:</b><br><i>No explanation provided by the AI.</i></div>`;
  }
}

// Helper: Parse AI response for code, explanation, time/space complexity
function parseAIResponse(text) {
  let code = '';
  let explanation = '';
  let time = '';
  let space = '';
  // Extract code block (```...```)
  const codeMatch = text.match(/```[\s\S]*?\n([\s\S]*?)```/);
  if (codeMatch) {
    code = codeMatch[1].trim();
  }
  // Extract explanation by label
  let explMatch = text.match(/Explanation[:\-\n]*([\s\S]*?)(?=Time Complexity|Space Complexity|```|$)/i);
  if (explMatch && explMatch[1].trim()) {
    explanation = explMatch[1].trim();
  } else {
    // Try to find explanation after code block
    if (codeMatch) {
      const afterCode = text.split(codeMatch[0])[1]?.trim();
      if (afterCode) {
        // Try to get up to time/space complexity
        let expl = afterCode.split(/Time Complexity|Space Complexity/i)[0].trim();
        if (expl) explanation = expl;
      }
      // If still not found, try before code block
      if (!explanation) {
        const beforeCode = text.split(codeMatch[0])[0].trim();
        if (beforeCode) explanation = beforeCode;
      }
    } else {
      // If no code block, use the whole text as explanation
      explanation = text.trim();
    }
  }
  // Remove LaTeX \boxed{...} and show only the content inside
  explanation = explanation.replace(/\\boxed\{([^}]*)\}/g, '$1');
  // Extract time complexity
  const timeMatch = text.match(/Time Complexity[:\-\s]*([\s\S]*?)(?=Space Complexity|$)/i);
  if (timeMatch) {
    time = timeMatch[1].split(/\n|\./)[0].trim();
  }
  // Extract space complexity
  const spaceMatch = text.match(/Space Complexity[:\-\s]*([\s\S]*?)(?=\n|$)/i);
  if (spaceMatch) {
    space = spaceMatch[1].split(/\n|\./)[0].trim();
  }
  // Remove LaTeX math delimiters from time and space
  time = time.replace(/\$|\\\(|\\\)/g, '').trim();
  space = space.replace(/\$|\\\(|\\\)/g, '').trim();
  return { code, explanation, time, space };
}
// Helper: Escape HTML for code
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, function(tag) {
    const charsToReplace = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return charsToReplace[tag] || tag;
  });
}

function showError(message) {
  document.getElementById('questionTitle').textContent = '';
  document.getElementById('deepSeekResponse').style.display = 'none';
  document.getElementById('loadingText').style.display = 'none';
  const errorElement = document.getElementById('errorMessage');
  errorElement.textContent = message;
  errorElement.style.display = 'block';
} 