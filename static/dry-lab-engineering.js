/* Dry-lab engineering cycles. Each theme opens with its purpose, then Design–Build–Test–Learn iterations. */
window.DRYLAB_ENGINEERING = [
  {
    title: "Shapes of the cleaved peptides",
    intro: [
      "TACE cuts the fusion peptide at the linker GGGSLAQAVRGGGS. What remains are three pieces we would later want to dock: the IL-23R antagonist candidates MEESKQLQLGGGSLAQA and TEEEQQYLGGGSLAQA, and the immunomodulator piece VRGGGSLKEKKGGGSLAQA. Docking against one frozen shape would treat a short, flexible peptide as if it had only one pose.",
      "The purpose of this theme is to obtain a set of shapes, not a single picture. The first iteration asked AlphaFold3 for that picture. It was confident and still. The later iterations used replica-exchange molecular dynamics, and had to heat the ladder before the replicas actually swapped."
    ],
    cycles: [
      {
        title: "AlphaFold3",
        phases: {
          design: [
            "Before any dynamics, we needed a three-dimensional starting model of each cleaved residue. AlphaFold3 was the practical first tool: it proposes a fold from sequence, and a high-confidence model would tell us whether the three peptides even looked like compact binders. The sequences were MEESKQLQLGGGSLAQA, TEEEQQYLGGGSLAQA, and VRGGGSLKEKKGGGSLAQA. Each carries a glycine-rich stub of the TACE linker, so we already expected the chain to be floppy rather than a single rigid domain."
          ],
          build: [
            "We built one AlphaFold3 model for each of the three post-cleavage residues. These models were the structures we would have handed to a docking program if a single pose had been enough."
          ],
          test: [
            "AlphaFold3 returned high-confidence conformations. They were also static. Each peptide was one shape, with no record of the other shapes it can reach. That is a known limit of a still prediction on a short peptide whose linker is rich in glycine. GGGS does not hold one geometry. A confidence score on one frame does not describe the ensemble."
          ],
          learn: [
            "A confident still picture is not a set of binding poses. Docking the AlphaFold3 model alone would have scored one arrangement and missed the rest. We dropped static structure prediction as the characterization method and moved to all-atom molecular dynamics with the CHARMM36m force field. The sampling method was multi-volume replica-exchange molecular dynamics (MV-REMD), which runs copies of the same peptide at different temperatures and lets them trade coordinates, so a peptide stuck in one well can escape."
          ]
        },
        hmw: "Next: sample many shapes with MV-REMD, because one AlphaFold3 pose is not an ensemble."
      },
      {
        title: "First temperature ladder",
        phases: {
          design: [
            "Replica exchange only works when neighboring temperatures swap often enough. We aimed for about a 25% chance of exchange. GROMACS treats a mean acceptance between 20% and 40% as the range where adjacent replicas overlap and the walk through temperature is real. Below that, each replica stays in its own temperature and the “exchange” is mostly a label.",
            "The first peptide through this test was TEEEQQYLGGGSLAQA. Its N-terminus, TEEEQQYL, is a dense run of polar and charged residues. We still started with a modest ladder, 300 K to 341.34 K, and 32 replicas, expecting that span to be enough for a peptide this short."
          ],
          build: [
            "We ran MV-REMD on TEEEQQYLGGGSLAQA with 32 replicas spaced from 300 K to 341.34 K, and measured the exchange probability the ladder actually produced."
          ],
          test: [
            "The exchange probability was 13.9%. That is below the 20% floor. The replicas were not mixing. A ladder that looks reasonable on paper was not hot enough, or not overlapped enough, for this sequence."
          ],
          learn: [
            "The failure has a structural reason. The stretch EEEQQ forms persistent hydrogen-bond networks. Those bonds pin the N-terminus in narrow energy wells. At a top temperature of 341.34 K the hottest replica still could not climb out, so the energy histograms of neighboring replicas barely overlapped and swaps were rare. Raising the ceiling, rather than adding a new force field, was the change that followed: the hottest copies need to unfold if the exchange is going to carry that freedom back down to room temperature."
          ]
        },
        hmw: "Next: raise the top of the ladder to about 380 K so the hottest replicas can unfold."
      },
      {
        title: "A hotter ladder",
        phases: {
          design: [
            "The method stayed MV-REMD and the force field stayed CHARMM36m. Only the temperature window changed. The maximum was raised from 341.34 K to about 380 K, high enough to disrupt the local hydrogen-bond clusters and let the hottest replicas unfold. We applied that hotter ladder to the two peptides that had not yet been run this way: VRGGGSLKEKKGGGSLAQA and MEESKQLQLGGGSLAQA."
          ],
          build: [
            "VRGGGSLKEKKGGGSLAQA was run with 31 replicas. MEESKQLQLGGGSLAQA was run with 30 replicas. Both ladders topped out near 380 K."
          ],
          test: [
            "Both runs exchanged at above 20%. That sits inside the 20–40% window GROMACS uses as a sign that neighboring replicas overlap and the sampling is actually moving."
          ],
          learn: [
            "The first ladder failed because 341.34 K never broke the hydrogen-bond cluster in TEEEQQYL. The hotter ceiling fixed the exchange for the LKEKK piece and the MEE piece. Those two peptides now have a mixing ensemble, which is the input a later docking step would use. We do not describe a 380 K rerun of TEEEQQYLGGGSLAQA. That rerun is not part of this record. What this iteration established is the ladder that mixes, and the reason the cooler one did not."
          ]
        },
        hmw: "The peptide shapes can now move. The next theme builds the skin surface they would have to cross."
      }
    ]
  },
  {
    title: "A psoriatic stratum corneum",
    intro: [
      "The cleaved peptides are only useful if they can meet skin. The outer barrier is the stratum corneum, a stack of lipid sheets. In healthy skin those sheets are a rigid gel. In psoriasis the lipid mix changes, so a model copied from healthy skin would be the wrong surface.",
      "The purpose of this theme is a bilayer we can trust as psoriatic stratum corneum: ordered enough to look like the real lamellae, and composed like diseased skin rather than a textbook 1:1:1 mix. The first build looked right in the setup file and fell apart on inspection. The second build changed both the software and the recipe."
    ],
    cycles: [
      {
        title: "CHARMM-GUI and a placeholder lipid",
        phases: {
          design: [
            "Literature on psoriatic stratum corneum describes an upregulation of the shorter ceramides and the shorter fatty acids. We took that as the design brief and built the first bilayer in CHARMM-GUI’s Martini mode. The target was 450 lipids at a cholesterol : free fatty acid : ceramide ratio of 1:1:1, counted as 150 cholesterol, 120 short ceramides (XCER), 30 longer ceramides (PCER), 120 palmitic-length fatty acids (FFA16), and 30 longer fatty acids (FFA24).",
            "CHARMM-GUI had no input for free fatty acids. POPC was placed in those positions as a temporary spacer, then removed so the fatty acids could be put back. The assumption was that the holes left by that swap would close during relaxation."
          ],
          build: [
            "The 450-lipid Martini system was energy-minimized and equilibrated. That relaxed membrane, not the starting grid, is what we judged."
          ],
          test: [
            "In PyMOL the lamellae were loose and broken. A stratum corneum sheet should be a tight gel-phase stack. This one was not. The mean squared displacement reached 120 nm² over 1000 ns, which means the lipids were wandering far too freely. The picture and the number agreed: the model was too fluid to stand in for skin."
          ],
          learn: [
            "Two choices had damaged the sheet, and they are separable. Removing POPC left voids in the constructed grid, so the bilayer started with holes and never recovered a gel. Separately, a further look at the literature showed that cholesterol itself is upregulated in psoriasis. The healthy 1:1:1 ratio of cholesterol, fatty acid, and ceramide is therefore the wrong disease target. The extreme short-chain mix on top of those holes made the failure worse. The next model had to be built without a phospholipid placeholder, and with more cholesterol than the healthy ratio allows."
          ]
        },
        hmw: "Next: build the bilayer from scratch in Packmol, with more cholesterol and no POPC placeholder."
      },
      {
        title: "Packmol, built for psoriasis",
        phases: {
          design: [
            "Packmol can place each lipid where we tell it to, so the fatty acids no longer need a POPC stand-in. The new counts follow the revised disease picture: more cholesterol, and a ceramide pool shifted toward the longer PCER species that the first recipe had under-used. The bilayer was specified as 160 PCER, 40 XCER, 240 cholesterol, 120 FFA16, and 60 FFA24. Nothing in that list is a temporary phospholipid."
          ],
          build: [
            "The starting coordinates were generated directly in Packmol from that composition. There was no deletion step and no grid of holes to heal."
          ],
          test: [
            "PyMOL showed a lamellar sheet with the ordered stacking expected of stratum corneum, rather than the loose debris of the first model. The mean squared displacement showed limited fluidization, in line with the rigidity of a gel-phase barrier. The same two checks that rejected the CHARMM-GUI model now supported this one."
          ],
          learn: [
            "The membrane we keep is the Packmol model. It earned that status because the lamellae stayed ordered and the lipids stayed slow, and because its composition includes the cholesterol increase reported for psoriasis. The CHARMM-GUI model remains the negative control: a 1:1:1 Martini build with a POPC placeholder does not survive equilibration. Later insertion tests use this second sheet, not the first."
          ]
        },
        hmw: "Next: put the skin-penetration peptide on this sheet, and see whether the sheet survives."
      }
    ]
  },
  {
    title: "Placing the peptide on the membrane",
    intro: [
      "The therapy depends on a skin-penetrating sequence getting past the stratum corneum. A correct membrane model is not evidence that the peptide can enter it. This theme asks a narrower question: if we place the full fusion peptide on the Packmol sheet, does the sheet stay a sheet?",
      "The full chain carries both antagonist pieces, the LKEKK piece, two linker repeats, and the penetrating motif DRTTLTN. The iteration below is that placement. It damaged the membrane. The decision at the end is to insert only the short motif, and that shorter placement does not yet have a result."
    ],
    cycles: [
      {
        title: "Five copies of the full peptide",
        phases: {
          design: [
            "We inserted the full-length fusion peptide onto the surface of the psoriatic stratum corneum from the previous theme. The sequence was MEESKQLQLGGGSLAQAVRGGGSLKEKKGGGSLAQAVRGGGSDRTTLTN. Five copies were used, enough to see whether the surface could accept the chain without rewriting the whole lipid recipe. The membrane composition was no longer the variable. Insertion was."
          ],
          build: [
            "The five peptides were placed on the surface of the Packmol model. When the first placements looked poor, the insertion conditions were adjusted and the placement was tried again. The membrane underneath was the model that had already passed the lamellar and displacement checks."
          ],
          test: [
            "The adjustments did not save the sheet. Insertion of the full-length peptide produced serious structural artifacts in the stratum corneum. The ordered lamellae from the previous theme were no longer a fair model of skin. A penetration result read off a broken membrane would not mean the peptide had crossed a barrier. It would mean the barrier had been wrecked by the setup."
          ],
          learn: [
            "The full chain is too much for this insertion setup. It asks the gel to accommodate two antagonist segments, LKEKK, and the linkers at the same moment as the piece that is supposed to enter. We took a reductionist step: isolate the active site DRTTLTN, the motif responsible for penetration, and insert that short sequence alone. The record of this theme ends at that decision. It does not say whether the short peptide left the lamellae intact."
          ]
        },
        hmw: "Next, when the data exist: insert DRTTLTN alone, and judge the membrane with the same PyMOL and displacement checks."
      }
    ]
  }
];
