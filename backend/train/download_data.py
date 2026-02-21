import os
import wfdb
import numpy as np

def download_mit_bih(data_dir="data/mit-bih"):
    """
    Downloads the MIT-BIH Arrhythmia Database from PhysioNet.
    """
    print(f"Downloading MIT-BIH dataset to {data_dir}...")
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)
        
    # The database string on physionet
    wfdb.dl_database('mitdb', data_dir)
    print("Download complete!")

if __name__ == "__main__":
    download_mit_bih()
