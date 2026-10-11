import numpy as np
import pandas as pd
from pathlib import Path
from typing import Optional

def generate_cybersecurity_dataset(
    n_samples: int = 2000,
    attack_ratio: float = 0.15,
    random_seed: int = 42,
    include_labels: bool = True
) -> pd.DataFrame:
    """
    Generates realistic synthetic cybersecurity network flow traffic modeled after
    CIC-IDS2017 & UNSW-NB15 flow characteristics.
    
    Includes realistic distributions for:
    - Flow Duration (microsec)
    - Total Fwd Packets
    - Total Backward Packets
    - Total Length of Fwd Packets
    - Total Length of Bwd Packets
    - Flow Bytes/s
    - Flow Packets/s
    - Packet Length Mean
    - Packet Length Std
    - SYN Flag Count
    - ACK Flag Count
    - Down/Up Ratio
    - Average Packet Size
    - Label ("BENIGN", "DoS", "PortScan", "Bot") if include_labels=True
    """
    rng = np.random.default_rng(random_seed)

    n_attacks = int(n_samples * attack_ratio) if include_labels else 0
    n_benign = n_samples - n_attacks

    # --- BENIGN TRAFFIC ---
    # Typical web browsing, streaming, API traffic
    b_duration = rng.exponential(scale=35000, size=n_benign) + 500
    b_fwd_pkts = rng.poisson(lam=8, size=n_benign) + 1
    b_bwd_pkts = rng.poisson(lam=12, size=n_benign) + 1
    b_fwd_len = b_fwd_pkts * rng.uniform(40, 250, size=n_benign)
    b_bwd_len = b_bwd_pkts * rng.uniform(200, 1400, size=n_benign)
    b_flow_bytes_s = (b_fwd_len + b_bwd_len) / (b_duration / 1000.0 + 0.001)
    b_flow_pkts_s = (b_fwd_pkts + b_bwd_pkts) / (b_duration / 1000.0 + 0.001)
    b_pkt_len_mean = (b_fwd_len + b_bwd_len) / (b_fwd_pkts + b_bwd_pkts)
    b_pkt_len_std = rng.uniform(20, 150, size=n_benign)
    b_syn_flag = rng.choice([0, 1], p=[0.92, 0.08], size=n_benign)
    b_ack_flag = rng.choice([0, 1], p=[0.10, 0.90], size=n_benign)
    b_down_up_ratio = b_bwd_pkts / (b_fwd_pkts + 0.001)
    b_avg_pkt_size = b_pkt_len_mean * rng.uniform(0.95, 1.05, size=n_benign)
    b_labels = ["BENIGN"] * n_benign

    df_benign = pd.DataFrame({
        "Flow Duration": np.round(b_duration, 1),
        "Total Fwd Packets": b_fwd_pkts,
        "Total Backward Packets": b_bwd_pkts,
        "Total Length of Fwd Packets": np.round(b_fwd_len, 1),
        "Total Length of Bwd Packets": np.round(b_bwd_len, 1),
        "Flow Bytes/s": np.round(b_flow_bytes_s, 2),
        "Flow Packets/s": np.round(b_flow_pkts_s, 2),
        "Packet Length Mean": np.round(b_pkt_len_mean, 2),
        "Packet Length Std": np.round(b_pkt_len_std, 2),
        "SYN Flag Count": b_syn_flag,
        "ACK Flag Count": b_ack_flag,
        "Down/Up Ratio": np.round(b_down_up_ratio, 2),
        "Average Packet Size": np.round(b_avg_pkt_size, 2),
    })
    if include_labels:
        df_benign["Label"] = b_labels

    if n_attacks > 0:
        # Divide attacks into DoS, PortScan, Bot
        n_dos = int(n_attacks * 0.45)
        n_portscan = int(n_attacks * 0.35)
        n_bot = n_attacks - n_dos - n_portscan

        # 1. DoS Flood
        dos_duration = rng.exponential(scale=5000, size=n_dos) + 100
        dos_fwd_pkts = rng.poisson(lam=120, size=n_dos) + 30
        dos_bwd_pkts = rng.poisson(lam=2, size=n_dos)
        dos_fwd_len = dos_fwd_pkts * rng.uniform(800, 1500, size=n_dos)
        dos_bwd_len = dos_bwd_pkts * rng.uniform(0, 100, size=n_dos)
        dos_flow_bytes_s = (dos_fwd_len + dos_bwd_len) / (dos_duration / 1000.0 + 0.001)
        dos_flow_pkts_s = (dos_fwd_pkts + dos_bwd_pkts) / (dos_duration / 1000.0 + 0.001)
        dos_pkt_len_mean = (dos_fwd_len + dos_bwd_len) / (dos_fwd_pkts + dos_bwd_pkts + 0.001)
        dos_pkt_len_std = rng.uniform(200, 450, size=n_dos)
        dos_syn_flag = rng.choice([0, 1], p=[0.05, 0.95], size=n_dos)  # SYN Flood
        dos_ack_flag = rng.choice([0, 1], p=[0.85, 0.15], size=n_dos)
        dos_down_up_ratio = dos_bwd_pkts / (dos_fwd_pkts + 0.001)
        dos_avg_pkt_size = dos_pkt_len_mean * rng.uniform(0.95, 1.05, size=n_dos)

        df_dos = pd.DataFrame({
            "Flow Duration": np.round(dos_duration, 1),
            "Total Fwd Packets": dos_fwd_pkts,
            "Total Backward Packets": dos_bwd_pkts,
            "Total Length of Fwd Packets": np.round(dos_fwd_len, 1),
            "Total Length of Bwd Packets": np.round(dos_bwd_len, 1),
            "Flow Bytes/s": np.round(dos_flow_bytes_s, 2),
            "Flow Packets/s": np.round(dos_flow_pkts_s, 2),
            "Packet Length Mean": np.round(dos_pkt_len_mean, 2),
            "Packet Length Std": np.round(dos_pkt_len_std, 2),
            "SYN Flag Count": dos_syn_flag,
            "ACK Flag Count": dos_ack_flag,
            "Down/Up Ratio": np.round(dos_down_up_ratio, 2),
            "Average Packet Size": np.round(dos_avg_pkt_size, 2),
            "Label": ["DoS"] * n_dos
        })

        # 2. PortScan
        scan_duration = rng.uniform(10, 500, size=n_portscan)
        scan_fwd_pkts = rng.poisson(lam=2, size=n_portscan) + 1
        scan_bwd_pkts = np.zeros(n_portscan, dtype=int)
        scan_fwd_len = scan_fwd_pkts * 40.0
        scan_bwd_len = np.zeros(n_portscan)
        scan_flow_bytes_s = scan_fwd_len / (scan_duration / 1000.0 + 0.001)
        scan_flow_pkts_s = scan_fwd_pkts / (scan_duration / 1000.0 + 0.001)
        scan_pkt_len_mean = 40.0 * np.ones(n_portscan)
        scan_pkt_len_std = np.zeros(n_portscan)
        scan_syn_flag = np.ones(n_portscan, dtype=int)
        scan_ack_flag = np.zeros(n_portscan, dtype=int)
        scan_down_up_ratio = np.zeros(n_portscan)
        scan_avg_pkt_size = 40.0 * np.ones(n_portscan)

        df_scan = pd.DataFrame({
            "Flow Duration": np.round(scan_duration, 1),
            "Total Fwd Packets": scan_fwd_pkts,
            "Total Backward Packets": scan_bwd_pkts,
            "Total Length of Fwd Packets": np.round(scan_fwd_len, 1),
            "Total Length of Bwd Packets": scan_bwd_len,
            "Flow Bytes/s": np.round(scan_flow_bytes_s, 2),
            "Flow Packets/s": np.round(scan_flow_pkts_s, 2),
            "Packet Length Mean": scan_pkt_len_mean,
            "Packet Length Std": scan_pkt_len_std,
            "SYN Flag Count": scan_syn_flag,
            "ACK Flag Count": scan_ack_flag,
            "Down/Up Ratio": scan_down_up_ratio,
            "Average Packet Size": scan_avg_pkt_size,
            "Label": ["PortScan"] * n_portscan
        })

        # 3. Botnet Command & Control
        bot_duration = rng.uniform(80000, 200000, size=n_bot)
        bot_fwd_pkts = rng.poisson(lam=18, size=n_bot) + 5
        bot_bwd_pkts = rng.poisson(lam=15, size=n_bot) + 5
        bot_fwd_len = bot_fwd_pkts * rng.uniform(300, 700, size=n_bot)
        bot_bwd_len = bot_bwd_pkts * rng.uniform(300, 700, size=n_bot)
        bot_flow_bytes_s = (bot_fwd_len + bot_bwd_len) / (bot_duration / 1000.0 + 0.001)
        bot_flow_pkts_s = (bot_fwd_pkts + bot_bwd_pkts) / (bot_duration / 1000.0 + 0.001)
        bot_pkt_len_mean = (bot_fwd_len + bot_bwd_len) / (bot_fwd_pkts + bot_bwd_pkts + 0.001)
        bot_pkt_len_std = rng.uniform(50, 120, size=n_bot)
        bot_syn_flag = rng.choice([0, 1], p=[0.8, 0.2], size=n_bot)
        bot_ack_flag = rng.choice([0, 1], p=[0.2, 0.8], size=n_bot)
        bot_down_up_ratio = bot_bwd_pkts / (bot_fwd_pkts + 0.001)
        bot_avg_pkt_size = bot_pkt_len_mean * rng.uniform(0.95, 1.05, size=n_bot)

        df_bot = pd.DataFrame({
            "Flow Duration": np.round(bot_duration, 1),
            "Total Fwd Packets": bot_fwd_pkts,
            "Total Backward Packets": bot_bwd_pkts,
            "Total Length of Fwd Packets": np.round(bot_fwd_len, 1),
            "Total Length of Bwd Packets": np.round(bot_bwd_len, 1),
            "Flow Bytes/s": np.round(bot_flow_bytes_s, 2),
            "Flow Packets/s": np.round(bot_flow_pkts_s, 2),
            "Packet Length Mean": np.round(bot_pkt_len_mean, 2),
            "Packet Length Std": np.round(bot_pkt_len_std, 2),
            "SYN Flag Count": bot_syn_flag,
            "ACK Flag Count": bot_ack_flag,
            "Down/Up Ratio": np.round(bot_down_up_ratio, 2),
            "Average Packet Size": np.round(bot_avg_pkt_size, 2),
            "Label": ["Bot"] * n_bot
        })

        full_df = pd.concat([df_benign, df_dos, df_scan, df_bot], ignore_index=True)
    else:
        full_df = df_benign

    # Shuffle rows deterministically
    shuffled_df = full_df.sample(frac=1.0, random_state=random_seed).reset_index(drop=True)
    return shuffled_df

def populate_sample_datasets(output_dir: Path):
    """
    Generates ready-to-use sample dataset CSV files in output_dir:
    1. cicids_sample_train.csv (Training dataset, largely normal/benign network traffic)
    2. cicids_sample_val.csv   (Validation dataset with labels for threshold tuning)
    3. cicids_sample_test.csv  (Held-out Test dataset with labels for final evaluation)
    4. unsw_sample_detect.csv  (Unlabeled or live network capture for anomaly detection)
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    # Train dataset (1500 samples, low contamination ~3%)
    df_train = generate_cybersecurity_dataset(n_samples=1500, attack_ratio=0.03, random_seed=42)
    df_train.to_csv(output_dir / "cicids_sample_train.csv", index=False)

    # Validation dataset (400 samples, 20% attack ratio)
    df_val = generate_cybersecurity_dataset(n_samples=400, attack_ratio=0.20, random_seed=101)
    df_val.to_csv(output_dir / "cicids_sample_val.csv", index=False)

    # Test dataset (600 samples, 25% attack ratio)
    df_test = generate_cybersecurity_dataset(n_samples=600, attack_ratio=0.25, random_seed=202)
    df_test.to_csv(output_dir / "cicids_sample_test.csv", index=False)

    # Detection stream dataset (500 samples, simulated live traffic)
    df_detect = generate_cybersecurity_dataset(n_samples=500, attack_ratio=0.15, random_seed=303, include_labels=False)
    df_detect.to_csv(output_dir / "unsw_sample_detect.csv", index=False)
