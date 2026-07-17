// analyzer.js — drag & drop upload, API call, results rendering, PDF export

(function () {
  'use strict';

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const fileChip = document.getElementById('fileChip');
  const fileName = document.getElementById('fileName');
  const fileSize = document.getElementById('fileSize');
  const fileRemove = document.getElementById('fileRemove');
  const jobDescription = document.getElementById('jobDescription');
  const analyzeForm = document.getElementById('analyzeForm');
  const analyzeBtn = document.getElementById('analyzeBtn');

  const uploadCard = document.getElementById('uploadCard');
  const loadingPanel = document.getElementById('loadingPanel');
  const resultsPanel = document.getElementById('resultsPanel');
  const reanalyzeBtn = document.getElementById('reanalyzeBtn');
  const downloadBtn = document.getElementById('downloadBtn');

  let selectedFile = null;
  let latestAnalysis = null;

  const toast = (type, title, msg) => window.Resuno?.showToast(type, title, msg);

  /* ---------- File selection ---------- */
  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function setFile(file) {
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const validExt = /\.(pdf|docx)$/i.test(file.name);

    if (!validTypes.includes(file.type) && !validExt) {
      toast('error', 'Unsupported file', 'Please upload a PDF or DOCX resume.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('error', 'File too large', 'Max upload size is 5MB.');
      return;
    }

    selectedFile = file;
    fileName.textContent = file.name;
    fileSize.textContent = formatBytes(file.size);
    fileChip.classList.add('show');
    dropzone.style.display = 'none';
  }

  dropzone?.addEventListener('click', () => fileInput.click());
  fileInput?.addEventListener('change', (e) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  });

  ['dragenter', 'dragover'].forEach((evt) => {
    dropzone?.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
  });
  ['dragleave', 'drop'].forEach((evt) => {
    dropzone?.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });
  dropzone?.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files?.[0];
    if (file) setFile(file);
  });

  fileRemove?.addEventListener('click', () => {
    selectedFile = null;
    fileInput.value = '';
    fileChip.classList.remove('show');
    dropzone.style.display = '';
  });

  /* ---------- Loading sequence ---------- */
  function runLoadingSequence() {
    uploadCard.style.display = 'none';
    loadingPanel.classList.add('show');
    resultsPanel.classList.remove('show');

    const steps = ['step1', 'step2', 'step3', 'step4'];
    const titles = [
      'Extracting text from your resume…',
      'Running AI analysis…',
      'Scoring sections & keywords…',
      'Finalizing your report…'
    ];
    const progressFill = document.getElementById('progressFill');
    const loadingTitle = document.getElementById('loadingTitle');

    let i = 0;
    progressFill.style.width = '8%';
    const interval = setInterval(() => {
      steps.forEach((id) => document.getElementById(id).classList.remove('active'));
      document.getElementById(steps[i]).classList.add('active');
      loadingTitle.textContent = titles[i];
      progressFill.style.width = `${Math.min(92, (i + 1) * 24)}%`;
      i = (i + 1) % steps.length;
    }, 1400);

    return () => {
      clearInterval(interval);
      progressFill.style.width = '100%';
    };
  }

  /* ---------- Submit ---------- */
  analyzeForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      toast('error', 'No file selected', 'Please upload a PDF or DOCX resume to continue.');
      return;
    }

    analyzeBtn.disabled = true;
    const stopLoading = runLoadingSequence();

    const formData = new FormData();
    formData.append('resume', selectedFile);
    formData.append('jobDescription', jobDescription.value || '');

    try {
      const res = await fetch('/api/analyze', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Something went wrong analyzing your resume.');
      }

      latestAnalysis = data.data;
      stopLoading();

      setTimeout(() => {
        loadingPanel.classList.remove('show');
        renderResults(latestAnalysis);
        resultsPanel.classList.add('show');
        resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        toast('success', 'Analysis complete', 'Your resume report is ready below.');
      }, 500);
    } catch (err) {
      stopLoading();
      loadingPanel.classList.remove('show');
      uploadCard.style.display = '';
      toast('error', 'Analysis failed', err.message || 'Please try again.');
    } finally {
      analyzeBtn.disabled = false;
    }
  });

  reanalyzeBtn?.addEventListener('click', () => {
    resultsPanel.classList.remove('show');
    uploadCard.style.display = '';
    fileRemove?.click();
    jobDescription.value = '';
    uploadCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ---------- Render results ---------- */
  function animateRing(circleEl, valueEl, score) {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.max(0, Math.min(100, Number(score) || 0));
    const offset = circumference - (clamped / 100) * circumference;
    circleEl.style.strokeDasharray = `${circumference}`;
    requestAnimationFrame(() => {
      circleEl.style.strokeDashoffset = `${offset}`;
    });
    animateCount(valueEl, clamped);
  }

  function animateCount(el, target) {
    let start = 0;
    const duration = 1000;
    const startTime = performance.now();
    function tick(now) {
      const progress = Math.min(1, (now - startTime) / duration);
      el.textContent = Math.round(start + (target - start) * progress);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function renderList(el, items, iconSvg) {
    el.innerHTML = '';
    (items || []).forEach((item) => {
      const li = document.createElement('li');
      li.innerHTML = `${iconSvg}<span>${escapeHtml(item)}</span>`;
      el.appendChild(li);
    });
  }

  function renderTags(el, items, cls) {
    el.innerHTML = '';
    (items || []).forEach((item) => {
      const span = document.createElement('span');
      span.className = `tag ${cls}`;
      span.textContent = item;
      el.appendChild(span);
    });
    if (!items || items.length === 0) {
      el.innerHTML = '<span style="color:var(--slate); font-size:13px;">None detected.</span>';
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  const CHECK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="#059669"><path d="M5 12l4 4L19 6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const WARN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="#d97706"><path d="M12 9v4M12 17h.01" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="9" stroke-width="1.6"/></svg>';

  function renderResults(data) {
    animateRing(document.getElementById('ringResume'), document.getElementById('valResume'), data.resumeScore);
    animateRing(document.getElementById('ringAts'), document.getElementById('valAts'), data.atsScore);
    animateRing(document.getElementById('ringMatch'), document.getElementById('valMatch'), data.matchScore);

    document.getElementById('summaryText').textContent = data.summary || 'No summary available.';

    renderList(document.getElementById('strengthsList'), data.strengths, CHECK_ICON);
    renderList(document.getElementById('weaknessesList'), data.weaknesses, WARN_ICON);
    renderTags(document.getElementById('missingSkillsList'), data.missingSkills, 'missing-tag');
    renderTags(document.getElementById('presentSkillsList'), data.presentSkills, 'present-tag');

    // Section analysis
    const sectionWrap = document.getElementById('sectionAnalysisRows');
    sectionWrap.innerHTML = '';
    const sections = data.sections || {};
    Object.keys(sections).forEach((key) => {
      const section = sections[key];
      const row = document.createElement('div');
      row.className = 'section-row';
      row.innerHTML = `
        <div class="section-row-label">${key}</div>
        <div style="flex:1;">
          <div class="section-bar-track"><div class="section-bar-fill" style="width:0%;" data-score="${section.score}"></div></div>
          <div class="section-feedback">${escapeHtml(section.feedback || '')}</div>
        </div>
        <div class="section-row-score">${section.score}</div>
      `;
      sectionWrap.appendChild(row);
    });
    requestAnimationFrame(() => {
      sectionWrap.querySelectorAll('.section-bar-fill').forEach((bar) => {
        bar.style.width = `${bar.dataset.score}%`;
      });
    });

    // Recommendations
    const recsList = document.getElementById('recsList');
    recsList.innerHTML = '';
    (data.recommendations || []).forEach((rec, idx) => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="recs-num">${idx + 1}</span><span>${escapeHtml(rec)}</span>`;
      recsList.appendChild(li);
    });
  }

  /* ---------- PDF download ---------- */
  downloadBtn?.addEventListener('click', () => {
    if (!latestAnalysis || !window.jspdf) {
      toast('error', 'Nothing to export', 'Run an analysis first.');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 48;
    let y = margin;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxWidth = pageWidth - margin * 2;

    function addTitle(text) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(17, 21, 49);
      doc.text(text, margin, y);
      y += 26;
    }
    function addHeading(text) {
      checkPage(24);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(79, 70, 229);
      doc.text(text, margin, y);
      y += 18;
    }
    function addBody(text) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(51, 65, 85);
      const lines = doc.splitTextToSize(text, maxWidth);
      lines.forEach((line) => {
        checkPage(14);
        doc.text(line, margin, y);
        y += 14;
      });
      y += 6;
    }
    function checkPage(need) {
      if (y + need > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
    }

    addTitle('Resuno — Resume Analysis Report');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, margin, y);
    y += 26;

    addHeading('Scores');
    addBody(`Resume Score: ${latestAnalysis.resumeScore}/100   |   ATS Score: ${latestAnalysis.atsScore}/100   |   JD Match: ${latestAnalysis.matchScore}/100`);

    addHeading('AI Verdict');
    addBody(latestAnalysis.summary || '—');

    addHeading('Strengths');
    (latestAnalysis.strengths || []).forEach((s) => addBody(`• ${s}`));

    addHeading('Weaknesses');
    (latestAnalysis.weaknesses || []).forEach((s) => addBody(`• ${s}`));

    addHeading('Missing Skills');
    addBody((latestAnalysis.missingSkills || []).join(', ') || 'None detected.');

    addHeading('Skills Found');
    addBody((latestAnalysis.presentSkills || []).join(', ') || 'None detected.');

    addHeading('Section Analysis');
    const sections = latestAnalysis.sections || {};
    Object.keys(sections).forEach((key) => {
      addBody(`${key.charAt(0).toUpperCase() + key.slice(1)} — ${sections[key].score}/100: ${sections[key].feedback}`);
    });

    addHeading('AI Recommendations');
    (latestAnalysis.recommendations || []).forEach((r, idx) => addBody(`${idx + 1}. ${r}`));

    doc.save('resuno-resume-report.pdf');
    toast('success', 'Report downloaded', 'Your PDF report has been saved.');
  });
})();
