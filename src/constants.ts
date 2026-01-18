import { Post, Invite, ReportItem } from './types';

export const IMAGES = {
  splashBg: "https://lh3.googleusercontent.com/aida-public/AB6AXuCRdmiVXQ8a6BiiRE4-GTssWMZe_QIIjFBow8Z9nD7HqlR5SJwQVVFGAYSx1bRZVFdcO6PJ3KdgRzjt3g7QWDzwVC5iPGQLw0Lp3ZNNXA96fZaPD-mdcct9VqFtRjE9g6maeRQz3KE-NMvhLDe_uztMd3W2MTD6FkWch44SgvPOwDCFZsdKwmCvIl7VW3EUtFrsP4IWF8JeoUbH1U5sJley7Py-P3wj3yXGOZcSloRF_tdyjGiS9qIBebQDgSpzU6OBhjg7PJ8AOimg",
  avatar1: "https://lh3.googleusercontent.com/aida-public/AB6AXuDBrBJ8QQ8nscoYZfx-PAb69m2-4nmvdrRWr3Hu4EwM58hktjmPMXMNmhuv-MNU8O4dXIOVUNRhc3ErRVeTYdL_jkmb7p4fIzg0DpkASxBBR_9NV5cNvPyWkpP-cbLHZ6bkuxKc2Mmub__d87emtJJ5AMSIPCeg9MheUGQ-DHaKrNTD_tJ5220qfWYFxIbp5PqFAm9O_lHWmA8OJHU0O741LBr0iADvyyQOLvR_HAwOLpjhqOtT0WPEtsxPDlrkauU3smgGtM3M0wWd",
  cockpit: "https://lh3.googleusercontent.com/aida-public/AB6AXuAUI1Bs4LVF3-ve14L5BzuabKQRn0PUD6Vft3ZOQ2Qkl1oKjlhl-gbYyGvKqIwCY5poPDihGnPaoPSjCLEzuxJePULMr1Loa7SqH1wBw2j50Vh1vUHXDlW9qIHApZhtF4uLfDn6zTGuD4t-JQdZXVXVWeVINCaTONh2kNNZumbtJcwKSxLwFnrYf0aFKhgjqzREbPeie7sWT29bjShcVoZvMiifF7iYVge7pPxXj1pInNqjrdLzLoYAN68v1v-px3jAFKg4w8w6mKWs",
  radar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAjv_ABW_t1yxDKuIZI5KFgRxJHQMFFZTPAGcoMZfiPYmxBpdVB76Spff_q2WinRRYsV47R8T-ZxDQXyzjs4RuOlbumIFLWOqa8bwLexBMx7CnQHg6J5Vu78ywHcm8fWqYZwvVAEBDCaIj_jO4z7r1KpL-64JK6Z_dJ6TL3BtuLfQp8W6vfRPxN2fdi03aoW0GNwUWohCofnYsSnU3AzY0I4emZN0DRgLJw52JS0nXh25WTNNKumCXnQa8Hbd2IWFpScN5R9CwO1RWJ",
  pilotAvatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDs-cQYNKJjNoC7fA7sPR8oITNtHe0D0mHGR5q593fMSizlalJL_zv4BZ1cTLaoD3DmYLBZHNVEEk7ICr4vxHDPq71pmteLMLatpaKjGkj7oSZDnHkzGhZk2QBLD9A20pWwNKctHQI112LOjILlOJfVoRjeThX7d41wJ7fH1Fcy36BERoDldOPDtwFkru1wvUyRGLkZ8OqgoiVV9CwybJBRtRYM5tv1hm7A8-rZvweRuqJuhvHx-PAh_PJhcnpnxaKOiwLVJ2_323r5",
  fogRunway: "https://lh3.googleusercontent.com/aida-public/AB6AXuDzxIey-w5lELYzksmBCE53kEapKhPPN5o4CHnHRhIQLwvxExD8Yq3e4KqRg__yu2bP_kkJBwST6cInoMP71uoeRpG8U0X52GZBgbIB49QQ2ZUpGg35Gt5SYzLFFVCLoiApgAWZQzMgejdNS1a1ZgsMx6gN0XB60y2ckxBb9SC9liOJbuYirDr7hNtyFre2JetMEO0NW8VXJWG9jkgCSEuqKFARSSpNRWMzum2CB3nfQfgR9Jm9-BOZQDAQkPB-dPBNYUpAar8qnj6x",
  groundStaffAvatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuBa7FP7jQ7aMu0tYyGAiBzQLhomlzPEqDZOA1C2CtvvtTHy-GYn__9lXo_eIMjLNxqV_-xcyiaO3jNk1dAFi1dxlALWLIwvXwMWYgFXipb7YmuoIqS7hHDtbgGAy-D3byvdWs4wPWmfIowR7FYsLdQjRruViRPhy0szcLm0vYDQZgyun2a18saiZIlN8UBNTLWXMOOlFh2o8jYtTQ_PVzVYvrz31mOjEuXIVdkGqFrh4smzzgSWoty4YrRY8T5xMuV9NNrVhauLMBYX",
  cameraPreview: "https://lh3.googleusercontent.com/aida-public/AB6AXuBAVjzL60IEEzdr9wZydPmfehvG1VDl7c909rag47zljHrYCOl4jMywpMIIOAsi_0OMcFUGUDqm1nto22lMBdaurxC-RSSWiXT-71bnYNv2L44JxHC003-CYxHyIim5p1GmNBzDAZCBSrsDFhrfJOHHmwyYMMJgAJF2Oda76i9ECMiAncFMS-6npvSwK4Cwfp0UOTBWb494YvnLkLCYf69u4gSyt4rtGuiJKFIht3V-hG-PJ4ovxFckvfbQnelVt_HTedXgtJz_79Kz",
  myAvatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCqVUBzjpCc-f2CM8VzhT4GJgoyGIPxhZG6hNDA5gaWH6FFiI7IYaCR74o8w4wQV6apG0Cg9Sd5vq_j4o9jHRRrAHdIfuV0foyQsrsVbTd8U0tRQSqasm4fGz03CEroTz_z9Q8iglZQUD2kkEMDUz-XjmA4SWPApBs0WD_mFNi_mFzJDq23lv9D7m9wRj3LBdJRqNbc4RuMBAg5PGb-AbEUasv5bS4-qQrCfxHhwFXR-BoKzF4r-tB8bZyPw6l08ErTlwjHxaCD2YK2",
  reviewer1: "https://lh3.googleusercontent.com/aida-public/AB6AXuAlyc1BtS7BRbIKbvUvsN79z0MLyUDfvhCK3mbE6H5m-Mj3fyFz39DYQZNjxFPzrOAOHh2L7O2kFfjR2Kfpv_BptoOq-oDStg8XLoJNQ4sBfFkBnsUfo-FkfLyh0LFpLPxWhEWqQZnWInoYD8Q4BezFtEhJzcciicvdHnuCY8X6Jb9glN_-Vwg31a2MFYvXAvYFOAbtASOsnaHsEDov3n60lWnqn8Az6NvoyxYHlB8Mh3NZ4E_qbmNJdcu7WoQ9vZvZvxfMZqcKzm12",
  reviewer2: "https://lh3.googleusercontent.com/aida-public/AB6AXuCy1wgJZBUafNJPV1dvDexVRx5IfQAbkUfM005jjU_tS_92gikFUskhqqDPaTjy6qjqSk6pcyRjJ9Pe2aqKPXHm63UjzBAaMUYg_WDIOaR8wy-SXM13-4wpTsjflGDyTmooGxJW4om5F_9hItqizl2xioNHtrLYyuTuuusvp9E-_lYh6mD09NdBfG87MJtuwPAQEmCoATFI3reU4KAyX0aKl6iXyaOGOfvyQEP4rWl_Df6ipJZEoVh48957pp9l38dvSJzrY-YF_HTX",
  reviewer3: "https://lh3.googleusercontent.com/aida-public/AB6AXuB8D3kGN9AQNird6e-_5DfGHpEYxlQ8V80nmt2SjSwTA1O8xJlP6tgf26mkKOOcDZMR9MLMkQ8GMKx2dM8pNOrG52_0Z5vRSpwVJqVs50p_Wuhf6cFi_4ePqLvMYKAiNA8aNkYtLJxZ5g2h9xBWd_kywGX8m4E7p1-BZxuCeCEagaZRWO2acg2ZlPQ7nBS9sD9oo6eknEK0KmuCphEtmAbOGJtUQX7nrj3uZ8JSAY9OuR7H7Ys7k7uzkx7Eu0W4H6F1PQflmO0PVsy0",
  commenter: "https://lh3.googleusercontent.com/aida-public/AB6AXuCo50749gBS-FIVOSapttW-PHcEob32NLb9a4G0EYEzkgBKjHxLlqY6SM3_1nwzNEpUtmHC4ZMjLWaGzZzeR3FAEliGOmijDJMdceA_ostzWt6dLRHLNHLJxYrF-jGRYIIofeLHRmlnBUvQMGHrYbYbFUVpQvtn4uafxzN8QAcvWsHto0vLZy2wQUSECceJOV9_voG3_R4wX5OvcrnBdPH_KghVXJNfUogeHfZUFDHVxTaD_12JCZX_YkClTP37UsRWGP4QA7lgZpU7",
  planeDetail: "https://lh3.googleusercontent.com/aida-public/AB6AXuDAQ0rXaY3CuRpLbFQJcqSxkU9SAprl8ysFtGI8ykzPM5i2o0yN48N7kRFx_glkLSAIdWshbSssuTfIbWziuadcC0ZS0A6TCfcJ4YHhiWNjjmmQkZ_fqy8y8acuV5hOoVMff21It43geSCExVzHKPbZj2h7RHMuOWqSa0brR-LZJJP1fRkb-uEqSnUkV-rLsTO1cojLdQt9nPb-mBKMZEu5fGnMKFPHI73txU6WfYzccDqcltdYOhaTcGa4DIOZTOB3SZ66SnSVW24k",
  profileMain: "https://lh3.googleusercontent.com/aida-public/AB6AXuDhmxwOrd7i8siZtTyvgkYMU76C-ZCwpjw_d46OFdkBPtzEIXBLE8W-LFb-90odLsqDawfZhIDbhxTD6L4bG6UHVfr74eTyZ91x4p89NlYAJDsdUbqz27D1oIJWCEwiGU8DmK2HzsWfDqp2WUb6zSJ5FstYx4n827dk2YkUwCcSvYfuM6PWneLCP_3PRrUr5CGTEmCDGPx71YzfJ6n5PF9G0FlgcPq-MKMU_Dr5Sg_WTnrt1Zdtnao79CrtLXbjwBOela-BI5R4q2F1",
  modImg1: "https://lh3.googleusercontent.com/aida-public/AB6AXuDMGKSA85En1msLiP212LkcPlcTybgFBhidwsw4QjZtSGQmzax7-9yt18NCwlUdO_knz_UkkeAHeKHOqzAPhPofIa-8co9tcCrlEtwdaejtWgF8McZCZxkFe_XgsFy10BWv7_EmO6OwmJ9So42m4ZJP4I4aAnRfZoI1i1eBVVSOrRv9I4u_AUBe5Ye1_5qUa0k5hBwMCDzmsQZO6WMSPNheYMgy89C0JBBSjewxFBmzYZh-QyPiLKTATuY-YcK9CRl4LXDsJJpNdoOn",
  modImg2: "https://lh3.googleusercontent.com/aida-public/AB6AXuA5BVe4RqHAy_4ltLUvDBKD1LUrlglaDJ0Am7uf2zMRXAAwN1ig3ZDJ2YAaKiOcYnlYRG4nSvgrZiglymBtPrJ5uWU_zS9UYq9o58AXOx9STb50csNC0gzPeOxYNd6Ag3DE4hgBvZS58GgnmdptY64m6wOPxik8tpggQhgBgJP5-x-l_xwEj6vzdNHcdFsDRBAXi5ygjrc-WLZvjIt9JqhNR_zfChAd569N3KLqp1zwmwExYKULcWGNNvl9t-C8crGnKFbWs4KRwUOp",
  modImg3: "https://lh3.googleusercontent.com/aida-public/AB6AXuBnScMX-zZCwMTm3lEqYdGfAF_mQlx-vB7Vp7wU5rRs09If2euy7hxcp7lFC-9ZR9IZGinAYtNq8GaE_SyiOOCZQrmQ_ezWpBO3yo1mPgRv_6BGA_iT8Byga3gOQEFfiidoLYtado6NEKygZJSNOV6BJg8Gg51gbcB9rlQT1QVuWKXOu_NzRYvS-ZwlRNUUjhwyQjn70qvs_16xhuKN_QD5K_1N6FCEnCNyhSr-uUUpxgyhEVzWTcKpxdmE1DYIP7ajYsjLo1CwzQ9i"
};

export const INITIAL_POSTS: Post[] = [
  {
    id: '1',
    type: 'official',
    user: { id: 'official', name: 'DECEA / REDEMET', avatar: '' }, // Official uses icon
    title: 'Atualização de TAF disponível',
    description: 'Novo terminal aerodrome forecast emitido. Mudança de vento prevista para as 15:00Z.',
    image: IMAGES.radar,
    timestamp: '5m ago',
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
    likes: 0,
    comments: []
  },
  {
    id: '2',
    type: 'collaborative',
    user: { id: 'u1', name: 'PR-GUZ (Pilot)', avatar: IMAGES.pilotAvatar, role: 'pilot' },
    category: 'Visibility',
    title: 'Fog forming on Rwy 15',
    description: 'Visible patches of ground fog near the threshold. Visibility reducing rapidly.',
    image: IMAGES.fogRunway,
    timestamp: '12m ago',
    createdAt: new Date(Date.now() - 12 * 60000).toISOString(),
    likes: 14,
    comments: [
      { id: 'c1', user: { id: 'u3', name: 'PT-JFG', avatar: IMAGES.commenter, role: 'pilot' }, text: 'Confirmo, acabei de arremeter por conta do teto baixo.', timestamp: 'Há 5 min' }
    ]
  },
  {
    id: '3',
    type: 'staff',
    user: { id: 'u2', name: 'Ground OBS (V. Silva)', avatar: IMAGES.groundStaffAvatar, role: 'staff' },
    category: 'Security',
    title: 'Wildlife activity near Taxiway Foxtrot',
    description: 'Small group of birds spotted near Bravo-Foxtrot intersection. Operations aware.',
    timestamp: '25m ago',
    createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
    likes: 0,
    comments: []
  }
];

export const INITIAL_INVITES: Invite[] = [
  { id: '1', invited_email: 'marcos.nunes@skyway.com', role_id: 'contributor', uses_left: 1, max_uses: 1, expires_at: '2026-02-01', revoked: false, token_hash: 'hash1' },
  { id: '2', invited_email: 'suporte.ground@tower.aero', role_id: 'contributor', uses_left: 0, max_uses: 1, expires_at: '2026-01-10', revoked: false, token_hash: 'hash2' },
  { id: '3', invited_email: 'lucas.ferreira@observer.app', role_id: 'contributor', uses_left: 5, max_uses: 10, expires_at: '2026-03-01', revoked: false, token_hash: 'hash3' },
];

export const INITIAL_REPORTS: ReportItem[] = [
  { id: 'r1', image: IMAGES.modImg1, title: 'Objeto estranho na Taxiway Bravo', subtitle: 'Cmte. Silva • Setor Norte', tag: 'Obstrução de Pista', tagColor: 'bg-amber-100 text-amber-700', timeAgo: '2 min' },
  { id: 'r2', image: IMAGES.modImg2, title: 'Visibilidade subestimada no METAR', subtitle: 'Ground Crew Alpha • Torre', tag: 'Clima Incorreto', tagColor: 'bg-blue-100 text-blue-700', timeAgo: '15 min' },
  { id: 'r3', image: IMAGES.modImg3, title: 'Foto artística sem fins operacionais', subtitle: 'Observer Beta • Terminal 2', tag: 'Spam / Irrelevante', tagColor: 'bg-purple-100 text-purple-700', timeAgo: '42 min' },
];
