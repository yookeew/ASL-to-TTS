import { useEffect, useRef, useState } from "react";
import * as ort from "onnxruntime-web";

export function useASLModel() {
  const sessionRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ort.InferenceSession.create("/asl_model.onnx").then((session) => {
      sessionRef.current = session;
      setReady(true);
    });
  }, []);

  const predict = async (flatLandmarks) => {
    if (!sessionRef.current) return null;

    const tensor = new ort.Tensor(
      "float32",
      Float32Array.from(flatLandmarks),
      [1, 63]   // batch size 1, 63 features
    );

    const feeds = { float_input: tensor };
    const results = await sessionRef.current.run(feeds);

    // output key is "label" for sklearn classifiers
    return results.label.data[0];
  };

  return { predict, ready };
}