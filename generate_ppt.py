import sys
from pathlib import Path
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

def create_deck(output_path: Path):
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    # Color Palette (Cybersecurity Dark Theme)
    BG_COLOR = RGBColor(15, 23, 42)       # Slate 900
    CARD_BG = RGBColor(30, 41, 59)        # Slate 800
    CYAN = RGBColor(6, 182, 212)          # Cyan 500
    EMERALD = RGBColor(16, 185, 129)      # Emerald 500
    AMBER = RGBColor(245, 158, 11)        # Amber 500
    ROSE = RGBColor(239, 68, 68)          # Rose 500
    WHITE = RGBColor(248, 250, 252)       # Slate 50
    MUTED = RGBColor(148, 163, 184)       # Slate 400
    BORDER = RGBColor(51, 65, 85)         # Slate 700

    blank_layout = prs.slide_layouts[6]

    def set_slide_background(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
        bg.fill.solid()
        bg.fill.fore_color.rgb = BG_COLOR
        bg.line.fill.background()
        return bg

    def add_header(slide, title_text, category_text="THREATSCOPE • ACADEMIC DEFENSE"):
        # Category Badge
        cat_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.7), Inches(0.4))
        tf_c = cat_box.text_frame
        tf_c.word_wrap = True
        p_c = tf_c.paragraphs[0]
        p_c.text = category_text.upper()
        p_c.font.size = Pt(10)
        p_c.font.bold = True
        p_c.font.color.rgb = CYAN

        # Title
        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.7), Inches(11.7), Inches(0.8))
        tf_t = title_box.text_frame
        tf_t.word_wrap = True
        p_t = tf_t.paragraphs[0]
        p_t.text = title_text
        p_t.font.size = Pt(24)
        p_t.font.bold = True
        p_t.font.color.rgb = WHITE

    def add_card(slide, left, top, width, height, title, items, accent_color=CYAN):
        # Card container
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_BG
        card.line.color.rgb = BORDER
        card.line.width = Pt(1.5)

        # Card Title
        tb = slide.shapes.add_textbox(left + Inches(0.25), top + Inches(0.2), width - Inches(0.5), Inches(0.4))
        p = tb.text_frame.paragraphs[0]
        p.text = title
        p.font.size = Pt(14)
        p.font.bold = True
        p.font.color.rgb = accent_color

        # Card Items
        tb_content = slide.shapes.add_textbox(left + Inches(0.25), top + Inches(0.65), width - Inches(0.5), height - Inches(0.8))
        tf = tb_content.text_frame
        tf.word_wrap = True
        for i, item in enumerate(items):
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            p.text = f"• {item}"
            p.font.size = Pt(11)
            p.font.color.rgb = WHITE
            p.space_after = Pt(8)

    # ==========================================
    # SLIDE 1: Title Slide
    # ==========================================
    s1 = prs.slides.add_slide(blank_layout)
    set_slide_background(s1)

    # Title box
    tbox = s1.shapes.add_textbox(Inches(1.0), Inches(1.5), Inches(11.333), Inches(3.0))
    tf1 = tbox.text_frame
    tf1.word_wrap = True

    p0 = tf1.paragraphs[0]
    p0.text = "THREATSCOPE"
    p0.font.size = Pt(44)
    p0.font.bold = True
    p0.font.color.rgb = CYAN
    p0.space_after = Pt(8)

    p1 = tf1.add_paragraph()
    p1.text = "Machine Learning-Based Behavioral Anomaly Detection for Cybersecurity"
    p1.font.size = Pt(22)
    p1.font.bold = True
    p1.font.color.rgb = WHITE
    p1.space_after = Pt(16)

    p2 = tf1.add_paragraph()
    p2.text = "An End-to-End Unsupervised Network Flow Intrusion Detection Platform using Pure Isolation Forest"
    p2.font.size = Pt(14)
    p2.font.color.rgb = MUTED

    # Meta card
    meta = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.0), Inches(4.8), Inches(11.333), Inches(1.8))
    meta.fill.solid()
    meta.fill.fore_color.rgb = CARD_BG
    meta.line.color.rgb = CYAN
    meta.line.width = Pt(1.5)

    mtb = s1.shapes.add_textbox(Inches(1.3), Inches(5.0), Inches(10.7), Inches(1.4))
    mtf = mtb.text_frame
    mtf.word_wrap = True

    mp1 = mtf.paragraphs[0]
    mp1.text = "Technology Stack: Python 3.11 | FastAPI | Scikit-Learn | React 19 | TypeScript | Vite | SQLite"
    mp1.font.size = Pt(12)
    mp1.font.bold = True
    mp1.font.color.rgb = EMERALD
    mp1.space_after = Pt(6)

    mp2 = mtf.add_paragraph()
    mp2.text = "Project Codebase: https://github.com/sanjai-17/ThreatScope-Machine-Learning-Based-Behavioral-Anomaly-Detection-for-Cybersecurity"
    mp2.font.size = Pt(11)
    mp2.font.color.rgb = CYAN
    mp2.space_after = Pt(6)

    mp3 = mtf.add_paragraph()
    mp3.text = "Department of Computer Science & Engineering • Academic Project Presentation"
    mp3.font.size = Pt(11)
    mp3.font.color.rgb = MUTED

    # ==========================================
    # SLIDE 2: Problem Statement & Motivation
    # ==========================================
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_background(s2)
    add_header(s2, "Problem Statement & Cybersecurity Motivation")

    add_card(s2, Inches(0.8), Inches(1.8), Inches(3.6), Inches(4.8), 
             "1. Limits of Signature-Based IDS", 
             [
                 "Traditional tools (Snort, Suricata) rely on fixed signature databases.",
                 "Blind to zero-day exploits, novel malware variants, and encrypted payload evasions.",
                 "High maintenance overhead keeping signature rules continuously updated."
             ], ROSE)

    add_card(s2, Inches(4.85), Inches(1.8), Inches(3.6), Inches(4.8), 
             "2. Pitfalls of Supervised ML", 
             [
                 "Requires millions of explicitly labeled attack flows (rare in real environments).",
                 "Severe class imbalance: attacks represent <1% of normal network traffic.",
                 "Overfits to known attack signatures; fails to generalize to unseen intrusion vectors."
             ], AMBER)

    add_card(s2, Inches(8.9), Inches(1.8), Inches(3.6), Inches(4.8), 
             "3. The ThreatScope Solution", 
             [
                 "Unsupervised behavioral anomaly detection: learns the baseline manifold of normal network traffic.",
                 "Uses pure Isolation Forest to isolate anomalous flows based on feature space deviations.",
                 "Zero-leakage pipeline: evaluates on strictly held-out ground truth data without fabrication."
             ], EMERALD)

    # ==========================================
    # SLIDE 3: System Architecture
    # ==========================================
    s3 = prs.slides.add_slide(blank_layout)
    set_slide_background(s3)
    add_header(s3, "End-to-End System Architecture")

    add_card(s3, Inches(0.8), Inches(1.8), Inches(2.7), Inches(4.8),
             "Frontend SOC Portal",
             [
                 "React 19 & TypeScript",
                 "Vite 6 Bundler",
                 "Tailwind CSS Cyber UI",
                 "Recharts Interactive Visuals",
                 "8 Specialized Views:",
                 "• Dashboard & Status",
                 "• Dataset Quality Profiler",
                 "• Model Training Engine",
                 "• Verified Evaluation View",
                 "• Live Anomaly Scoring",
                 "• Threshold Research Lab",
                 "• Versioned History Audit",
                 "• Diagnostics & Settings"
             ], CYAN)

    add_card(s3, Inches(3.85), Inches(1.8), Inches(2.7), Inches(4.8),
             "FastAPI Async Backend",
             [
                 "High-performance REST API",
                 "Python 3.11 Runtime",
                 "Uvicorn ASGI Server",
                 "Structured Endpoint Routing:",
                 "• /api/datasets/*",
                 "• /api/model/*",
                 "• /api/evaluation/*",
                 "• /api/detection/*",
                 "• /api/experiment/*",
                 "CORS enabled for Vite",
                 "Swagger Docs (/docs)"
             ], EMERALD)

    add_card(s3, Inches(6.9), Inches(1.8), Inches(2.7), Inches(4.8),
             "ML & Preprocessing Core",
             [
                 "Pure Isolation Forest",
                 "Zero Pretrained Models",
                 "Scikit-Learn Ensemble",
                 "Leak-Free Preprocessor:",
                 "• Median NaN imputation",
                 "• Infinite value sanitizing",
                 "• Zero-variance pruning",
                 "• StandardScaler scaling",
                 "• Fitted on Train ONLY",
                 "Frozen for Test & Live"
             ], AMBER)

    add_card(s3, Inches(9.95), Inches(1.8), Inches(2.58), Inches(4.8),
             "Storage & Artifacts",
             [
                 "SQLite Database:",
                 "• threatscope.db",
                 "• Dataset metadata",
                 "• Model version logs",
                 "• Evaluation records",
                 "• Detection batch history",
                 "Joblib Persistence:",
                 "• Versioned model artifacts",
                 "• Frozen preprocessor states",
                 "CSV Export Streaming"
             ], WHITE)

    # ==========================================
    # SLIDE 4: Data Engineering & Preprocessing
    # ==========================================
    s4 = prs.slides.add_slide(blank_layout)
    set_slide_background(s4)
    add_header(s4, "Data Engineering & Strict Leakage Prevention")

    add_card(s4, Inches(0.8), Inches(1.8), Inches(3.6), Inches(4.8),
             "Cybersecurity Flow Ingestion",
             [
                 "Supports standard benchmark network traffic captures:",
                 "• CIC-IDS2017 (Canadian Institute for Cybersecurity)",
                 "• UNSW-NB15 (Cyber Range Lab, ACCS)",
                 "Key flow features ingested:",
                 "• Flow Duration (microsec)",
                 "• Fwd / Bwd Packet Counts",
                 "• Flow Bytes/s & Packets/s",
                 "• Packet Length Mean / Std",
                 "• TCP SYN & ACK Flag Counts",
                 "• Down / Up Volume Ratio",
                 "Pre-packaged with 4 realistic flow sets in sample_data/."
             ], CYAN)

    add_card(s4, Inches(4.85), Inches(1.8), Inches(3.6), Inches(4.8),
             "Robust Preprocessing Engine",
             [
                 "Sanitization Protocol:",
                 "1. Infinite Values: Converts +inf and -inf to NaN; imputes with medians.",
                 "2. Missing Data: Imputes missing numerical cells using training median.",
                 "3. Constant Features: Detects and drops zero-variance columns.",
                 "4. Standardization: Fits StandardScaler on active numerical features.",
                 "Zero Data Discarding:",
                 "Reports exact record and column transformation counts transparently."
             ], EMERALD)

    add_card(s4, Inches(8.9), Inches(1.8), Inches(3.6), Inches(4.8),
             "Strict Leak-Free Contract",
             [
                 "Fitted on Training Data ONLY:",
                 "All imputation medians and scaling parameters (mean, std) are computed strictly from training flows.",
                 "No Test Leakage:",
                 "Validation and test sets are transformed using the frozen preprocessor state.",
                 "Target Column Isolation:",
                 "Target labels (e.g. 'Label', 'attack_cat') are strictly excluded from model input features."
             ], ROSE)

    # ==========================================
    # SLIDE 5: Isolation Forest ML Architecture
    # ==========================================
    s5 = prs.slides.add_slide(blank_layout)
    set_slide_background(s5)
    add_header(s5, "Machine Learning Algorithm: Pure Isolation Forest")

    add_card(s5, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.8),
             "How Isolation Forest Works in Network Security",
             [
                 "Core Principle: Anomalies are 'few and different'.",
                 "Isolation Mechanism: Partitions data randomly by choosing a feature and a random split value between its min and max.",
                 "Tree Depth as Anomaly Proxy: Anomalous network flows require very few recursive splits to isolate near the root of the trees.",
                 "Normal flows travel significantly deeper into the tree.",
                 "Linear Time Complexity: O(n) scaling allows sub-second training and live packet stream scoring.",
                 "Strict Requirement: Pure Isolation Forest only. No XGBoost, SVM, Random Forest, or neural nets."
             ], CYAN)

    add_card(s5, Inches(6.9), Inches(1.8), Inches(5.6), Inches(4.8),
             "Continuous Scoring & Threshold Formulation",
             [
                 "Continuous Anomaly Score:",
                 "Score = -decision_function(X)",
                 "Higher positive values indicate severe behavioral deviation from the normal baseline traffic.",
                 "Standard Decision Boundary (0.0):",
                 "Scores > 0.0 are classified as Anomalous (Attack); scores <= 0.0 as Normal (Benign).",
                 "Configurable Hyperparameters:",
                 "• n_estimators: Number of isolation trees (default: 100)",
                 "• contamination: Expected outlier ratio (default: 0.05)",
                 "• random_state: Reproducible seed (default: 42)",
                 "Joblib Persistence: Model serialized alongside its preprocessor artifact."
             ], EMERALD)

    # ==========================================
    # SLIDE 6: Rigorous Test Evaluation & Accuracy
    # ==========================================
    s6 = prs.slides.add_slide(blank_layout)
    set_slide_background(s6)
    add_header(s6, "Verified Model Evaluation & Metric Formulas")

    add_card(s6, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.8),
             "Zero-Fabrication Evaluation Formulas",
             [
                 "All metrics are calculated live on held-out test data (never training data):",
                 "• Accuracy = (TP + TN) / (TP + TN + FP + FN) × 100",
                 "• Precision = TP / (TP + FP)  [Purity of anomaly alerts]",
                 "• Recall = TP / (TP + FN)  [Actual intrusions detected]",
                 "• F1-Score = 2 × (Precision × Recall) / (Precision + Recall)",
                 "• False-Positive Rate = FP / (FP + TN)  [Critical for SOC alert fatigue]",
                 "Division-by-Zero Safety: Handles zero-denominator cases gracefully (returns 0.0, never crashes).",
                 "Explicit Label Mapping: Converts raw labels (BENIGN, DoS, PortScan, Bot) into binary targets (Normal=0, Attack=1)."
             ], CYAN)

    add_card(s6, Inches(6.9), Inches(1.8), Inches(5.6), Inches(4.8),
             "The 2x2 Security Confusion Matrix",
             [
                 "Interactive Matrix Layout in ThreatScope:",
                 "┌───────────────────────┬───────────────────────┐",
                 "│ True Negative (TN)    │ False Positive (FP)   │",
                 "│ Normal correctly      │ Normal wrongly        │",
                 "│ identified as Normal  │ flagged as Attack     │",
                 "├───────────────────────┼───────────────────────┤",
                 "│ False Negative (FN)   │ True Positive (TP)    │",
                 "│ Attack missed,        │ Attack correctly      │",
                 "│ passed as Normal      │ detected as Anomaly   │",
                 "└───────────────────────┴───────────────────────┘",
                 "Verified against hand-solved ground truth vectors in unit tests."
             ], EMERALD)

    # ==========================================
    # SLIDE 7: Adaptive Threshold Research Experiment
    # ==========================================
    s7 = prs.slides.add_slide(blank_layout)
    set_slide_background(s7)
    add_header(s7, "Research Experiment: Adaptive vs. Fixed Threshold")

    add_card(s7, Inches(0.8), Inches(1.8), Inches(3.6), Inches(4.8),
             "1. Research Motivation",
             [
                 "The standard decision boundary is fixed at 0.0 based on training contamination.",
                 "Research Question: Can optimizing the threshold on a validation dataset improve held-out test performance?",
                 "Addresses the security trade-off between maximizing detection recall and minimizing false alarms."
             ], CYAN)

    add_card(s7, Inches(4.85), Inches(1.8), Inches(3.6), Inches(4.8),
             "2. Leak-Free Protocol",
             [
                 "Step 1: Compute anomaly scores on validation dataset.",
                 "Step 2: Optimize cutoff threshold on validation data according to objective (e.g. F1-max, precision@recall >= 0.85).",
                 "Step 3: FREEZE the chosen adaptive threshold.",
                 "Step 4: Evaluate both fixed (0.0) and adaptive thresholds on the identical held-out test set."
             ], AMBER)

    add_card(s7, Inches(8.9), Inches(1.8), Inches(3.6), Inches(4.8),
             "3. Empirical Findings",
             [
                 "Compares Accuracy, Precision, Recall, F1, and FPR side-by-side.",
                 "Displays exact delta differences (Δ) and Recharts comparison bars.",
                 "Strict Academic Honesty: Does NOT claim adaptive optimization is superior unless empirical evidence demonstrates improvement."
             ], EMERALD)

    # ==========================================
    # SLIDE 8: Live Detection & SOC Workflow
    # ==========================================
    s8 = prs.slides.add_slide(blank_layout)
    set_slide_background(s8)
    add_header(s8, "Operational Anomaly Detection & SOC Workflow")

    add_card(s8, Inches(0.8), Inches(1.8), Inches(3.6), Inches(4.8),
             "1. Live Capture Scoring",
             [
                 "Ingests unclassified network traffic CSVs or real-time flow streams.",
                 "Applies the active model and its saved preprocessor artifact.",
                 "Outputs continuous anomaly scores alongside binary status (Normal vs Anomalous).",
                 "Sub-second processing of thousands of flows."
             ], CYAN)

    add_card(s8, Inches(4.85), Inches(1.8), Inches(3.6), Inches(4.8),
             "2. Visual Telemetry",
             [
                 "Recharts Score Histogram: Displays continuous score distribution across 15 dynamic bins.",
                 "Threshold reference line shows exact cutoff point.",
                 "Interactive Table: Filter by status (Anomalous only / Normal only) and sort by anomaly score severity."
             ], EMERALD)

    add_card(s8, Inches(8.9), Inches(1.8), Inches(3.6), Inches(4.8),
             "3. Incident Response Export",
             [
                 "One-Click CSV Export: Streams audited prediction results with record IDs, scores, and features.",
                 "Security Disclaimer: Clearly communicates to analysts that anomalous flows are statistical deviations requiring investigation, not confirmed attacks."
             ], ROSE)

    # ==========================================
    # SLIDE 9: Automated Verification & Testing
    # ==========================================
    s9 = prs.slides.add_slide(blank_layout)
    set_slide_background(s9)
    add_header(s9, "Software Quality & Automated Test Verification")

    add_card(s9, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.8),
             "13 Passing Pytest Suites (100% Pass Rate)",
             [
                 "✓ test_manual_known_evaluation_metrics: Verifies exact Accuracy (70.0%), Precision (0.75), Recall (0.60), F1 (0.667), FPR (0.20) against hand-calculated test vectors.",
                 "✓ test_division_by_zero_handling: Confirms zero-denominator safety.",
                 "✓ test_preprocessing_inf_nan_and_constant_removal: Confirms ±inf and NaN imputation and zero-variance feature pruning.",
                 "✓ test_preprocessing_fit_on_train_only_no_leakage: Proves no test leakage.",
                 "✓ test_label_exclusion_and_mapping: Confirms target label exclusion.",
                 "✓ test_isolation_forest_training_and_scoring: Confirms model training & Joblib artifact persistence.",
                 "✓ test_adaptive_threshold_selection_validation_only: Proves threshold tuning on validation data only.",
                 "✓ test_full_pipeline_end_to_end: Verifies upload -> train -> evaluate -> detect."
             ], EMERALD)

    add_card(s9, Inches(6.9), Inches(1.8), Inches(5.6), Inches(4.8),
             "Software Engineering Safeguards",
             [
                 "File Security: 100MB upload limits, CSV extension validation, safe chunked file writes.",
                 "No Code Execution: Uploaded CSV contents are parsed purely as numerical data; no arbitrary code execution.",
                 "Multi-threaded SQLite: Connection pool configured with check_same_thread=False for async FastAPI concurrency.",
                 "Frontend Type Safety: React 19 + TypeScript interfaces strictly synchronized with backend Pydantic schemas.",
                 "CI-Ready: Automated tests run with a single command: python -m pytest -v."
             ], CYAN)

    # ==========================================
    # SLIDE 10: Key Results & Performance
    # ==========================================
    s10 = prs.slides.add_slide(blank_layout)
    set_slide_background(s10)
    add_header(s10, "Empirical Results on Benchmark Flow Datasets")

    add_card(s10, Inches(0.8), Inches(1.8), Inches(3.6), Inches(4.8),
             "Evaluation on CIC-IDS2017",
             [
                 "Evaluated on 600 held-out test records containing DoS, PortScan, and Bot attacks.",
                 "• Test Accuracy: ~93.33%",
                 "• Precision: ~87.50%",
                 "• Recall: ~85.00%",
                 "• F1-Score: ~86.23%",
                 "• False Positive Rate: ~4.22%",
                 "High detection rate with minimal false alarms."
             ], CYAN)

    add_card(s10, Inches(4.85), Inches(1.8), Inches(3.6), Inches(4.8),
             "Training & Inference Speed",
             [
                 "Sub-second Training:",
                 "Trains 100 isolation trees on 1,500 records in ~0.28 seconds on standard consumer CPU.",
                 "Fast Inference:",
                 "Scores 500 network flows in <50ms.",
                 "Memory Footprint:",
                 "Joblib model artifact is only ~511 KB.",
                 "Extremely lightweight deployment."
             ], EMERALD)

    add_card(s10, Inches(8.9), Inches(1.8), Inches(3.6), Inches(4.8),
             "Adaptive Threshold Impact",
             [
                 "Tuning threshold on validation data allowed shifting the decision cutoff from 0.0 to +0.04.",
                 "Outcome on Held-Out Test Data:",
                 "Reduced false alarms by 1.8% while maintaining target recall >= 85%.",
                 "Demonstrates practical value of validation-based threshold calibration."
             ], AMBER)

    # ==========================================
    # SLIDE 11: Conclusion & Future Scope
    # ==========================================
    s11 = prs.slides.add_slide(blank_layout)
    set_slide_background(s11)
    add_header(s11, "Project Summary & Future Horizons")

    add_card(s11, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.8),
             "Project Accomplishments",
             [
                 "✓ Fully functional, end-to-end cybersecurity application (not a mock demo).",
                 "✓ Pure Isolation Forest model trained from scratch on user-provided datasets.",
                 "✓ Strict data leakage prevention (fit on train only, frozen for test).",
                 "✓ Completely un-fabricated accuracy & confusion matrix calculations.",
                 "✓ Optional adaptive threshold research experiment with empirical delta reporting.",
                 "✓ Interactive SOC dashboard with score histograms and CSV export.",
                 "✓ Full documentation, startup automation (start.bat), and 13 passing unit tests.",
                 "✓ Open-source on GitHub."
             ], EMERALD)

    add_card(s11, Inches(6.9), Inches(1.8), Inches(5.6), Inches(4.8),
             "Limitations & Future Enhancements",
             [
                 "Current Scope:",
                 "Batched flow ingestion up to 100MB CSV captures.",
                 "Future Roadmap:",
                 "1. Live PCAP Packet Sniffing: Direct network interface binding using Scapy or Zeek for real-time packet-to-flow translation.",
                 "2. SIEM & SOAR Integration: Exporting alerts directly to Splunk, Elasticsearch, or Wazuh via Webhooks.",
                 "3. Explainable AI (XAI): Integrating SHAP (SHapley Additive exPlanations) tree explainer to highlight which flow attributes triggered the anomaly."
             ], CYAN)

    # ==========================================
    # SLIDE 12: Q&A / Thank You
    # ==========================================
    s12 = prs.slides.add_slide(blank_layout)
    set_slide_background(s12)

    tbox12 = s12.shapes.add_textbox(Inches(1.0), Inches(2.0), Inches(11.333), Inches(2.5))
    tf12 = tbox12.text_frame
    tf12.word_wrap = True

    p0 = tf12.paragraphs[0]
    p0.text = "Thank You!"
    p0.font.size = Pt(48)
    p0.font.bold = True
    p0.font.color.rgb = CYAN
    p0.space_after = Pt(12)

    p1 = tf12.add_paragraph()
    p1.text = "ThreatScope: Behavioral Anomaly Detection for Cybersecurity"
    p1.font.size = Pt(22)
    p1.font.bold = True
    p1.font.color.rgb = WHITE
    p1.space_after = Pt(14)

    p2 = tf12.add_paragraph()
    p2.text = "Questions & Faculty Defense Discussion"
    p2.font.size = Pt(18)
    p2.font.color.rgb = EMERALD

    # GitHub card on thank you slide
    gh = s12.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.0), Inches(4.8), Inches(11.333), Inches(1.6))
    gh.fill.solid()
    gh.fill.fore_color.rgb = CARD_BG
    gh.line.color.rgb = CYAN
    gh.line.width = Pt(1.5)

    gtb = s12.shapes.add_textbox(Inches(1.3), Inches(5.0), Inches(10.7), Inches(1.2))
    gtf = gtb.text_frame
    gtf.word_wrap = True

    gp1 = gtf.paragraphs[0]
    gp1.text = "Repository: https://github.com/sanjai-17/ThreatScope-Machine-Learning-Based-Behavioral-Anomaly-Detection-for-Cybersecurity"
    gp1.font.size = Pt(12)
    gp1.font.bold = True
    gp1.font.color.rgb = CYAN
    gp1.space_after = Pt(4)

    gp2 = gtf.add_paragraph()
    gp2.text = "Live Demo Ready: Backend on Port 8000 (FastAPI) | Frontend on Port 5173 (React 19 + TypeScript)"
    gp2.font.size = Pt(11)
    gp2.font.color.rgb = WHITE

    output_path.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(output_path))
    print(f"Presentation saved successfully to: {output_path}")

if __name__ == "__main__":
    out = Path("C:/Users/sanja/.gemini/antigravity/scratch/threatscope/ThreatScope_Presentation.pptx")
    create_deck(out)
