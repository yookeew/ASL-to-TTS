import pandas as pd
import pickle
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

df = pd.read_csv("asl_static_dataset.csv")

# Sanity check
print(f"Dataset shape: {df.shape}")
print("\nSamples per letter:")
print(df['label'].value_counts().sort_index())

X = df.drop("label", axis=1).values
y = df["label"].values

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42
)

model = RandomForestClassifier(n_estimators=200, random_state=42)
model.fit(X_train, y_train)

print("\nClassification Report:")
print(classification_report(y_test, model.predict(X_test)))

with open("asl_model.pkl", "wb") as f:
    pickle.dump(model, f)

print("\nModel saved to asl_model.pkl")