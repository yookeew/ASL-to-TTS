import pickle
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

with open("asl_model.pkl", "rb") as f:
    model = pickle.load(f)

initial_type = [("float_input", FloatTensorType([None, 63]))]
onnx_model = convert_sklearn(
    model,
    initial_types=initial_type,
    options={id(model): {"zipmap": False}}
)

with open("asl_model.onnx", "wb") as f:
    f.write(onnx_model.SerializeToString())

print("Saved asl_model.onnx")

# Verify output names in case of runtime key errors
import onnx
loaded = onnx.load("asl_model.onnx")
print("Inputs: ", [i.name for i in loaded.graph.input])
print("Outputs:", [o.name for o in loaded.graph.output])