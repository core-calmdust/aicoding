# Export wildbg ONNX nets (MIT/Apache-2.0) to a compact float16 binary for the browser.
import onnx, numpy as np, json, sys
from onnx import numpy_helper
src = sys.argv[1]  # folder with contact.onnx, race.onnx
out = sys.argv[2]
blobs = []; man = {'format': 'f16', 'nets': {}}
off = 0
for name, act in [('contact', 'hardsigmoid'), ('race', 'relu')]:
    m = onnx.load(f'{src}/{name}.onnx')
    W = {t.name: numpy_helper.to_array(t).astype(np.float32) for t in m.graph.initializer}
    layers = []
    for ln in ['hidden1', 'hidden2', 'hidden3', 'output']:
        w = W[f'base_model.{ln}.weight']; b = W[f'base_model.{ln}.bias']
        if ln == 'hidden1': w = w.T.copy()   # store [in][out] for sparse accumulation
        a = np.concatenate([w.ravel(), b.ravel()]).astype(np.float16)
        layers.append({'name': ln, 'rows': int(w.shape[0]), 'cols': int(w.shape[1]), 'transposed': ln == 'hidden1', 'offset': off, 'n': int(a.size)})
        blobs.append(a); off += a.size
    man['nets'][name] = {'act': act, 'inputs': int(layers[0]['rows']), 'layers': layers}
data = np.concatenate(blobs)
data.tofile(out + '.bin'); json.dump(man, open(out + '.json', 'w'))
print('params', data.size, 'bytes', data.nbytes)
