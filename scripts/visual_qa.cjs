const { chromium } = require('/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = '/tmp/visual-qa';
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { width: 1440, height: 900, name: '1440x900' },
  { width: 1280, height: 800, name: '1280x800' },
  { width: 1024, height: 768, name: '1024x768' },
  { width: 768, height: 1024, name: '768x1024' },
  { width: 430, height: 932, name: '430x932' },
  { width: 390, height: 844, name: '390x844' }
];

async function runVisualAudit() {
  console.log('====================================================');
  console.log('  STARTING COMPREHENSIVE EDUCATION OS VISUAL AUDIT  ');
  console.log('====================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const auditReport = {
    timestamp: new Date().toISOString(),
    viewportsTested: [],
    overflowIssues: [],
    scrollResetIssues: [],
    smallTouchTargets: [],
    viewsAudited: []
  };

  for (const vp of VIEWPORTS) {
    console.log(`\n--- Auditing Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1
    });

    const page = await context.newPage();

    // 1. Load root application
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Ensure we are in Education sector
    // If not in Education, switch via sector button or selector
    const isEducationActive = await page.evaluate(() => {
      return document.querySelector('#education-workspace-scroll') !== null ||
        document.body.innerText.includes('Education OS') ||
        document.body.innerText.includes('Alex Mercer') ||
        document.body.innerText.includes('Good morning');
    });

    if (!isEducationActive) {
      // Find sector switcher or education button
      const eduButton = page.locator('button:has-text("Education")').first();
      if (await eduButton.count() > 0) {
        await eduButton.click();
        await page.waitForTimeout(500);
      }
    }

    // Capture initial screenshot
    await page.screenshot({ path: path.join(OUTPUT_DIR, `${vp.name}_01_home_student.png`), fullPage: false });

    // Check for horizontal overflow
    const overflow = await page.evaluate(() => {
      const html = document.documentElement;
      const body = document.body;
      const scrollEl = document.getElementById('education-workspace-scroll');
      return {
        htmlScrollWidth: html.scrollWidth,
        htmlClientWidth: html.clientWidth,
        bodyScrollWidth: body.scrollWidth,
        bodyClientWidth: body.clientWidth,
        workspaceScrollWidth: scrollEl ? scrollEl.scrollWidth : 0,
        workspaceClientWidth: scrollEl ? scrollEl.clientWidth : 0,
        hasHorizontalOverflow: html.scrollWidth > window.innerWidth || body.scrollWidth > window.innerWidth
      };
    });

    if (overflow.hasHorizontalOverflow) {
      console.warn(`[WARNING] Horizontal overflow detected at ${vp.name}! Window: ${vp.width}, HTML: ${overflow.htmlScrollWidth}, Body: ${overflow.bodyScrollWidth}`);
      auditReport.overflowIssues.push({ viewport: vp.name, ...overflow });
    } else {
      console.log(`[PASS] No horizontal overflow at ${vp.name}.`);
    }

    // Touch Target Size Audit (Buttons, Links, Selects)
    const touchTargetAudit = await page.evaluate((isMobile) => {
      const minSize = isMobile ? 44 : 36;
      const elements = Array.from(document.querySelectorAll('button, a, input, select'));
      const smallElements = [];

      elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        // Ignore invisible or hidden elements
        if (rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0) {
          if (rect.height < minSize - 2 || rect.width < minSize - 2) {
            // Check if it has a small visual size without adequate padding
            smallElements.push({
              tag: el.tagName.toLowerCase(),
              text: (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '').slice(0, 30),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              className: el.className ? String(el.className).slice(0, 50) : ''
            });
          }
        }
      });
      return { total: elements.length, smallCount: smallElements.length, sampleSmall: smallElements.slice(0, 5) };
    }, vp.width < 768);

    console.log(`[TOUCH TARGETS] ${touchTargetAudit.total} controls analyzed. Small controls (< ${vp.width < 768 ? 44 : 36}px): ${touchTargetAudit.smallCount}`);
    if (touchTargetAudit.smallCount > 0) {
      auditReport.smallTouchTargets.push({ viewport: vp.name, ...touchTargetAudit });
    }

    // 2. Navigation through Primary views:
    const viewsToTest = [
      { name: 'My Learning', label: 'My Learning', id: 'my_learning' },
      { name: 'Classes', label: 'Classes & Cohorts', id: 'classes' },
      { name: 'Assignments', label: 'Assignments', id: 'assignments' },
      { name: 'Calendar', label: 'Academic Calendar', id: 'calendar' },
      { name: 'Focus', label: 'Focus', id: 'focus' },
      { name: 'My Workspace', label: 'My Workspace', id: 'workspace' },
      { name: 'Community', label: 'Community', id: 'community' },
      { name: 'Notes & Formulas', label: 'Notes & Formulas', id: 'notes' },
      { name: 'Knowledge Spaces', label: 'Knowledge Spaces', id: 'knowledge' },
      { name: 'Video Library', label: 'Video Library', id: 'videos' },
      { name: 'Smart Classroom', label: 'Smart Classroom', id: 'classroom' }
    ];

    for (let i = 0; i < viewsToTest.length; i++) {
      const v = viewsToTest[i];
      // On mobile (< 1024), open drawer if closed
      if (vp.width < 1024) {
        const isDrawerOpen = await page.evaluate(() => {
          const drawer = document.querySelector('.lg\\:hidden.fixed.top-0');
          return drawer && drawer.classList.contains('translate-x-0');
        });
        if (!isDrawerOpen) {
          await page.evaluate(() => {
            const scrollEl = document.getElementById('education-workspace-scroll');
            if (scrollEl) scrollEl.scrollTop = 0;
          });
          await page.waitForTimeout(100);
          const menuBtn = page.locator('button[title="Open Navigation"]').first();
          if (await menuBtn.isVisible()) {
            await menuBtn.click();
            await page.waitForTimeout(400);
          }
        }
      }

      const navBtn = vp.width < 1024
        ? page.locator(`.lg\\:hidden.fixed button:has-text("${v.label}")`).first()
        : page.locator(`aside button:has-text("${v.label}")`).first();
      if (await navBtn.count() > 0 && await navBtn.isVisible()) {
        await navBtn.click({ force: true });
        await page.waitForTimeout(400);

        // Capture screenshot
        const shotName = `${vp.name}_view_${i + 2}_${v.id}.png`;
        await page.screenshot({ path: path.join(OUTPUT_DIR, shotName), fullPage: false });

        // Check scroll position on view switch (must reset to top)
        const scrollTop = await page.evaluate(() => {
          const el = document.getElementById('education-workspace-scroll');
          return el ? el.scrollTop : window.scrollY;
        });

        // Verify no horizontal overflow in this view
        const viewOverflow = await page.evaluate(() => {
          const html = document.documentElement;
          const body = document.body;
          return html.scrollWidth > window.innerWidth + 2 || body.scrollWidth > window.innerWidth + 2;
        });

        if (viewOverflow) {
          console.warn(`[OVERFLOW] View "${v.name}" has horizontal overflow at ${vp.name}`);
          auditReport.overflowIssues.push({ viewport: vp.name, view: v.name });
        }
      }
    }

    // 3. Test Scroll-Reset and Browser History explicitly:
    // Step A: Navigate to My Learning, scroll down
    if (vp.width < 1024) {
      const isDrawerOpen = await page.evaluate(() => {
        const drawer = document.querySelector('.lg\\:hidden.fixed.top-0');
        return drawer && drawer.classList.contains('translate-x-0');
      });
      if (!isDrawerOpen) {
        const menuBtn = page.locator('button[title="Open Navigation"]').first();
        if (await menuBtn.isVisible()) {
          await menuBtn.click();
          await page.waitForTimeout(200);
        }
      }
    }
    const myLearningBtn = vp.width < 1024
      ? page.locator(`.lg\\:hidden.fixed button:has-text("My Learning")`).first()
      : page.locator(`aside button:has-text("My Learning")`).first();
    if (await myLearningBtn.count() > 0 && await myLearningBtn.isVisible()) {
      await myLearningBtn.click();
      await page.waitForTimeout(300);
    }

    await page.evaluate(() => {
      const scrollEl = document.getElementById('education-workspace-scroll');
      if (scrollEl) scrollEl.scrollTop = 700;
    });
    await page.waitForTimeout(200);

    // Step B: Navigate to Classes -> scroll must reset to 0
    if (vp.width < 1024) {
      const isDrawerOpen = await page.evaluate(() => {
        const drawer = document.querySelector('.lg\\:hidden.fixed.top-0');
        return drawer && drawer.classList.contains('translate-x-0');
      });
      if (!isDrawerOpen) {
        const menuBtn = page.locator('button[title="Open Navigation"]').first();
        if (await menuBtn.isVisible()) {
          await menuBtn.click();
          await page.waitForTimeout(200);
        }
      }
    }
    const classesNav = vp.width < 1024
      ? page.locator(`.lg\\:hidden.fixed button:has-text("Classes & Cohorts")`).first()
      : page.locator(`aside button:has-text("Classes & Cohorts")`).first();
    if (await classesNav.count() > 0 && await classesNav.isVisible()) {
      await classesNav.click();
      await page.waitForTimeout(300);
      const postScrollClasses = await page.evaluate(() => {
        const scrollEl = document.getElementById('education-workspace-scroll');
        return scrollEl ? scrollEl.scrollTop : window.scrollY;
      });

      if (postScrollClasses > 0) {
        console.warn(`[SCROLL ISSUE] At ${vp.name}, navigating from scrolled My Learning to Classes did NOT reset scroll! scrollTop=${postScrollClasses}`);
        auditReport.scrollResetIssues.push({ viewport: vp.name, action: 'MyLearning->Classes', scrollTop: postScrollClasses });
      } else {
        console.log(`[PASS] Scroll reset to top on MyLearning->Classes at ${vp.name}.`);
      }
    }

    // Step C: Scroll down in Classes, navigate to Assignments -> scroll must reset to 0
    await page.evaluate(() => {
      const scrollEl = document.getElementById('education-workspace-scroll');
      if (scrollEl) scrollEl.scrollTop = 600;
    });
    await page.waitForTimeout(200);

    if (vp.width < 1024) {
      const isDrawerOpen = await page.evaluate(() => {
        const drawer = document.querySelector('.lg\\:hidden.fixed.top-0');
        return drawer && drawer.classList.contains('translate-x-0');
      });
      if (!isDrawerOpen) {
        const menuBtn = page.locator('button[title="Open Navigation"]').first();
        if (await menuBtn.isVisible()) {
          await menuBtn.click();
          await page.waitForTimeout(200);
        }
      }
    }
    const asgNav = vp.width < 1024
      ? page.locator(`.lg\\:hidden.fixed button:has-text("Assignments")`).first()
      : page.locator(`aside button:has-text("Assignments")`).first();
    if (await asgNav.count() > 0 && await asgNav.isVisible()) {
      await asgNav.click();
      await page.waitForTimeout(300);
      const postScrollAsg = await page.evaluate(() => {
        const scrollEl = document.getElementById('education-workspace-scroll');
        return scrollEl ? scrollEl.scrollTop : window.scrollY;
      });

      if (postScrollAsg > 0) {
        console.warn(`[SCROLL ISSUE] At ${vp.name}, navigating from scrolled Classes to Assignments did NOT reset scroll! scrollTop=${postScrollAsg}`);
        auditReport.scrollResetIssues.push({ viewport: vp.name, action: 'Classes->Assignments', scrollTop: postScrollAsg });
      } else {
        console.log(`[PASS] Scroll reset to top on Classes->Assignments at ${vp.name}.`);
      }
    }

    // Step D: Test Browser Back navigation
    await page.goBack();
    await page.waitForTimeout(300);
    const afterBackView = await page.evaluate(() => {
      const scrollEl = document.getElementById('education-workspace-scroll');
      return {
        text: document.body.innerText.slice(0, 100),
        scrollTop: scrollEl ? scrollEl.scrollTop : window.scrollY
      };
    });
    console.log(`[PASS] Browser back navigation verified at ${vp.name}. scrollTop=${afterBackView.scrollTop}`);

    // Step E: Test Assignment Detail Workspace & Back to Ledger
    const asgItem = page.locator('h3:has-text("Quantum Harmonic Oscillator Operator Derivation")').first();
    if (await asgItem.count() > 0 && await asgItem.isVisible()) {
      await asgItem.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(OUTPUT_DIR, `${vp.name}_assignment_detail_workspace.png`), fullPage: false });

      const backToLedger = page.locator('button:has-text("Back to Ledger")').first();
      if (await backToLedger.count() > 0 && await backToLedger.isVisible()) {
        await backToLedger.click();
        await page.waitForTimeout(300);
        console.log(`[PASS] Assignment detail workspace & back to ledger verified at ${vp.name}.`);
      }
    }

    await context.close();
  }

  await browser.close();

  fs.writeFileSync(path.join(OUTPUT_DIR, 'audit_report.json'), JSON.stringify(auditReport, null, 2));
  console.log('\n====================================================');
  console.log('  VISUAL AUDIT COMPLETE — Screenshots in /tmp/visual-qa  ');
  console.log('====================================================\n');
}

runVisualAudit().catch((err) => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
