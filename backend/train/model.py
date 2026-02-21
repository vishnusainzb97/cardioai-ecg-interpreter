import torch
import torch.nn as nn
import torch.nn.functional as F

class ResidualBlock1D(nn.Module):
    def __init__(self, in_channels, out_channels, stride=1):
        super(ResidualBlock1D, self).__init__()
        self.conv1 = nn.Conv1d(in_channels, out_channels, kernel_size=5, stride=stride, padding=2, bias=False)
        self.bn1 = nn.BatchNorm1d(out_channels)
        self.relu = nn.ReLU(inplace=True)
        self.conv2 = nn.Conv1d(out_channels, out_channels, kernel_size=5, stride=1, padding=2, bias=False)
        self.bn2 = nn.BatchNorm1d(out_channels)
        
        self.downsample = nn.Sequential()
        if stride != 1 or in_channels != out_channels:
            self.downsample = nn.Sequential(
                nn.Conv1d(in_channels, out_channels, kernel_size=1, stride=stride, bias=False),
                nn.BatchNorm1d(out_channels)
            )

    def forward(self, x):
        identity = self.downsample(x)

        out = self.conv1(x)
        out = self.bn1(out)
        out = self.relu(out)

        out = self.conv2(out)
        out = self.bn2(out)

        out += identity
        out = self.relu(out)
        return out

class ECGResNet1D(nn.Module):
    """
    A 1D ResNet architecture for ECG Beat Classification.
    Input size should be (Batch_Size, 1_Channel, Sequence_Length).
    Sequence_Length in our case is 360 (1 second at 360Hz).
    """
    def __init__(self, num_classes=2):
        super(ECGResNet1D, self).__init__()
        
        # Initial Convolution
        self.conv1 = nn.Conv1d(1, 32, kernel_size=15, stride=1, padding=7, bias=False)
        self.bn1 = nn.BatchNorm1d(32)
        self.relu = nn.ReLU(inplace=True)
        self.maxpool = nn.MaxPool1d(kernel_size=3, stride=2, padding=1)
        
        # ResNet Blocks
        self.layer1 = self._make_layer(32, 32, blocks=2, stride=1)
        self.layer2 = self._make_layer(32, 64, blocks=2, stride=2)
        self.layer3 = self._make_layer(64, 128, blocks=2, stride=2)
        self.layer4 = self._make_layer(128, 256, blocks=2, stride=2)
        
        # Classifier
        self.avgpool = nn.AdaptiveAvgPool1d(1)
        # Using Dropout for regularization
        self.dropout = nn.Dropout(0.5)
        self.fc = nn.Linear(256, num_classes)

    def _make_layer(self, in_channels, out_channels, blocks, stride):
        layers = []
        layers.append(ResidualBlock1D(in_channels, out_channels, stride))
        for _ in range(1, blocks):
            layers.append(ResidualBlock1D(out_channels, out_channels))
        return nn.Sequential(*layers)

    def forward(self, x):
        # x shape: [B, 1, 360]
        x = self.conv1(x)
        x = self.bn1(x)
        x = self.relu(x)
        x = self.maxpool(x)

        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)
        x = self.layer4(x)

        x = self.avgpool(x)
        x = torch.flatten(x, 1)
        x = self.dropout(x)
        x = self.fc(x)
        # Returns raw logits so we use CrossEntropyLoss
        return x

if __name__ == "__main__":
    # Test the model with dummy data
    model = ECGResNet1D(num_classes=2)
    # Batch size of 16, 1 channel, 360 length
    dummy_input = torch.randn(16, 1, 360)
    output = model(dummy_input)
    print(f"Model output shape: {output.shape}") 
    assert output.shape == (16, 2)
