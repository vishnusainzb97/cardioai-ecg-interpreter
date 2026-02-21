import os
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, f1_score
from model import ECGResNet1D

# Hyperparameters
BATCH_SIZE = 64
EPOCHS = 10
LEARNING_RATE = 0.001
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'mps' if torch.backends.mps.is_available() else 'cpu')

def load_data(data_dir=os.path.join(os.path.dirname(__file__), "..", "data", "processed")):
    print(f"Loading data from {data_dir}...")
    X = np.load(os.path.join(data_dir, "X.npy"))
    y = np.load(os.path.join(data_dir, "y.npy"))
    
    # X shape is (N, 360). PyTorch 1D convolutions expect (N, Channels, Length)
    # We expand dims to (N, 1, 360)
    X = np.expand_dims(X, axis=1)
    
    print(f"Loaded X with shape: {X.shape}")
    print(f"Loaded y with shape: {y.shape}")
    
    # Train test split. 
    # Stratified split ensures the proportion of arrhythmias is maintained in both train and test sets.
    # While a True Patient-Level Split is ideal, for this prototype stratified is a strong baseline.
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    # Create PyTorch datasets and loaders
    train_dataset = TensorDataset(torch.tensor(X_train, dtype=torch.float32), torch.tensor(y_train, dtype=torch.long))
    test_dataset = TensorDataset(torch.tensor(X_test, dtype=torch.float32), torch.tensor(y_test, dtype=torch.long))
    
    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=BATCH_SIZE, shuffle=False)
    
    return train_loader, test_loader, X_train.shape[0], X_test.shape[0]

def train_model():
    print(f"Using device: {DEVICE}")
    train_loader, test_loader, num_train, num_test = load_data()
    
    # Initialize the model
    model = ECGResNet1D(num_classes=2).to(DEVICE)
    
    # Loss and optimizer
    # Consider class imbalance if necessary (e.g. fewer arrhythmias than normals)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)
    
    best_f1 = 0.0
    model_save_path = os.path.join(os.path.dirname(__file__), "..", "model_weights.pth")
    
    for epoch in range(EPOCHS):
        # Training Phase
        model.train()
        train_loss = 0.0
        
        for inputs, labels in train_loader:
            inputs, labels = inputs.to(DEVICE), labels.to(DEVICE)
            
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item() * inputs.size(0)
            
        epoch_train_loss = train_loss / num_train
        
        # Evaluation Phase
        model.eval()
        test_loss = 0.0
        all_preds = []
        all_labels = []
        
        with torch.no_grad():
            for inputs, labels in test_loader:
                inputs, labels = inputs.to(DEVICE), labels.to(DEVICE)
                outputs = model(inputs)
                loss = criterion(outputs, labels)
                
                test_loss += loss.item() * inputs.size(0)
                _, preds = torch.max(outputs, 1)
                
                all_preds.extend(preds.cpu().numpy())
                all_labels.extend(labels.cpu().numpy())
                
        epoch_test_loss = test_loss / num_test
        epoch_test_f1 = f1_score(all_labels, all_preds, average='macro')
        
        print(f"Epoch {epoch+1}/{EPOCHS} - "
              f"Train Loss: {epoch_train_loss:.4f} | "
              f"Test Loss: {epoch_test_loss:.4f} F1-Score (Macro): {epoch_test_f1:.4f}")
              
        if epoch_test_f1 > best_f1:
            best_f1 = epoch_test_f1
            torch.save(model.state_dict(), model_save_path)
            print(f"--> Saved new best model with F1-Score: {best_f1:.4f}")
            
    # Final Evaluate
    print("\nTraining complete. Final evaluation on test set:")
    print("--------------------------------------------------")
    print(classification_report(all_labels, all_preds, target_names=['Normal', 'Arrhythmia']))
    print("--------------------------------------------------")
    print(f"Model saved to {os.path.abspath(model_save_path)}")

if __name__ == "__main__":
    train_model()
