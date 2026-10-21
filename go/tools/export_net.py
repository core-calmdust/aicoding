#!/usr/bin/env python3
"""Export a vibego PyTorch checkpoint to the compact binary read by go/engine.c.

Usage: python3 export_net.py model.pt out.bin [--q8]

Layout (little endian):
  magic 'GONN', u32 version(2), u32 C, u32 nblocks, u32 hc, u32 gc, u32 quant (0=f16, 1=int8/row)
  u8 kinds[nblocks] (0=nbt, 1=gpool), padded to 4 bytes
  then tensors in a fixed order (see TENSORS below). Each tensor:
    f16 : n halves
    q8  : rows f32 scales, then n int8   (only for big conv / embed weights; small ones stay f16)
BatchNorm layers are folded to (scale, bias) pairs: y = x*scale + bias.
"""
import struct, sys
import numpy as np
import torch

EPS = 1e-5


def bn(sd, p):
    w, b, m, v = (sd[p + k].float().numpy() for k in ('.weight', '.bias', '.running_mean', '.running_var'))
    s = w / np.sqrt(v + EPS)
    return s.astype(np.float32), (b - m * s).astype(np.float32)


def main():
    src, dst = sys.argv[1], sys.argv[2]
    q8 = '--q8' in sys.argv
    ck = torch.load(src, map_location='cpu', weights_only=False)
    cfg, sd = ck['model_config'], ck['model']
    assert list(ck['spatial_subset']) == [0, 1, 2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 14, 17]
    assert list(ck['global_subset']) == [5, 14]
    assert cfg.get('pattern_embed') and not cfg.get('pattern_embed5')
    C = cfg['channels']; kinds = cfg['block_kinds']; hc = cfg['head_channels']; gc = cfg['gpool_channels']
    out = bytearray()
    out += b'GONN' + struct.pack('<6I', 2, C, len(kinds), hc, gc, 1 if q8 else 0)
    kb = bytes(0 if k == 'nbt' else 1 for k in kinds)
    out += kb + b'\0' * ((4 - len(kb) % 4) % 4)

    def put(a, big=False):
        nonlocal out
        a = np.ascontiguousarray(np.asarray(a, dtype=np.float32))
        if q8 and big:
            rows = a.reshape(a.shape[0], -1)
            sc = np.abs(rows).max(1) / 127.0
            sc[sc == 0] = 1.0
            q = np.clip(np.round(rows / sc[:, None]), -127, 127).astype(np.int8)
            out += sc.astype('<f4').tobytes() + q.tobytes()
        else:
            out += a.astype('<f2').tobytes()
        while len(out) % 4:
            out += b'\0'

    def conv(name, big=True):
        put(sd[name + ('' if name.endswith('.weight') else '.weight')].float().numpy(), big)

    def bnp(name):
        s, b = bn(sd, name)
        put(s); put(b)

    conv('stem.weight')
    put(sd['global_fc.weight'].numpy()); put(sd['global_fc.bias'].numpy())
    put(sd['pattern_embed.embed.weight'].float().numpy(), True)
    for i, k in enumerate(kinds):
        p = f'blocks.{i}.'
        if k == 'nbt':
            bnp(p + 'bn_in'); conv(p + 'conv_in')
            for n in ('n1', 'n2'):
                bnp(p + n + '_bn1'); conv(p + n + '_conv1')
                bnp(p + n + '_bn2'); conv(p + n + '_conv2')
            bnp(p + 'bn_out'); conv(p + 'conv_out')
        else:
            bnp(p + 'bn1'); conv(p + 'conv_reg'); conv(p + 'conv_pool')
            bnp(p + 'bn_pool')
            put(sd[p + 'fc_pool.weight'].numpy()); put(sd[p + 'fc_pool.bias'].numpy())
            bnp(p + 'bn2'); conv(p + 'conv2')
    bnp('trunk_bn')
    put(sd["p_conv.weight"].numpy())
    bnp('p_bn'); put(sd['p_out.weight'].numpy()); put(sd['p_out.bias'].numpy())
    put(sd['p_pass.weight'].numpy()); put(sd['p_pass.bias'].numpy())
    put(sd['v_conv.weight'].numpy()); bnp('v_bn')
    put(sd['v_fc1.weight'].numpy()); put(sd['v_fc1.bias'].numpy())
    put(sd['v_value.weight'].numpy()); put(sd['v_value.bias'].numpy())
    put(sd['v_score.weight'].numpy()); put(sd['v_score.bias'].numpy())
    put(sd['o_conv.weight'].numpy()); bnp('o_bn')
    put(sd['o_out.weight'].numpy()); put(sd['o_out.bias'].numpy())
    open(dst, 'wb').write(out)
    print(dst, len(out), 'bytes', 'C=%d blocks=%d' % (C, len(kinds)))


if __name__ == '__main__':
    main()
