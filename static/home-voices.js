/**
 * Voices star map: glow on constellation nodes, quotes on hover.
 */
(function () {
  var DESIGN_W = 1064;
  var DESIGN_H = 911;
  var map = document.getElementById("fg-voices-map");
  var layer = document.getElementById("fg-star-nodes");

  if (!map || !layer) {
    return;
  }

  var nodes = [
    {
      x: 355,
      y: 108,
      quote:
        "It's the subtle things. The person on the MTR who looks at my arm, pauses, and quietly moves to the next handrail."
    },
    {
      x: 350,
      y: 172,
      quote:
        "At the swimming pool, someone asked me to leave. He thought my rash was contagious."
    },
    {
      x: 276,
      y: 235,
      quote:
        "When you have a flare-up, you become a master of hiding. Long sleeves in mid-summer. High collars. Anything to stop the staring before it starts."
    },
    {
      x: 461,
      y: 199,
      quote:
        "The waiter used two fingers to take my credit card, trying his best not to brush against my hands."
    },
    {
      x: 438,
      y: 243,
      quote:
        "A coworker saw my hands and asked, \"Have you tried just washing them more often?\" As if it were a matter of hygiene."
    },
    {
      x: 382,
      y: 303,
      quote:
        "At a salon, the stylist gasped when she parted my hair and quietly asked if she should wear gloves."
    },
    {
      x: 609,
      y: 101,
      quote:
        "People on the street still sell me miracle creams, as if I simply have not tried hard enough to fix myself."
    },
    {
      x: 705,
      y: 159,
      quote:
        "I sat down on a crowded bus. The person next to me stood up immediately and walked away."
    },
    {
      x: 802,
      y: 268,
      quote:
        "In summer I still choose long sleeves. The heat is easier than explaining plaques to strangers."
    },
    {
      x: 837,
      y: 408,
      quote:
        "A classmate asked if I had slept in dirt. I laughed so she would not see I wanted to leave."
    },
    {
      x: 775,
      y: 480,
      quote:
        "My scalp flares before interviews. I spend the morning hiding flakes on a black shirt."
    },
    {
      x: 831,
      y: 504,
      quote:
        "Dates go well until they notice my elbows. Then the questions start, or the silence does."
    },
    {
      x: 794,
      y: 581,
      quote:
        "A relative said it was stress, then diet, then \"not drinking enough water.\" Nobody asked how it felt."
    },
    {
      x: 328,
      y: 600,
      quote:
        "Gym staff once wiped the bench after I stood up, in front of everyone. I did not go back."
    },
    {
      x: 374,
      y: 611,
      quote:
        "I tell new doctors it is psoriasis before they speak. I am tired of being treated as a hygiene problem."
    },
    {
      x: 381,
      y: 681,
      quote:
        "Kids point. Parents pull them closer. I look at the floor until the lift doors open."
    },
    {
      x: 350,
      y: 732,
      quote:
        "I stopped wearing short sleeves to family dinners. It was easier than hearing another home remedy."
    },
    {
      x: 249,
      y: 739,
      quote:
        "The itch is one thing. The shame of shaking someone's hand is another."
    },
    {
      x: 244,
      y: 662,
      quote:
        "A hotel receptionist asked if I needed a doctor for \"that infection.\" I was only checking in."
    },
    {
      x: 372,
      y: 545,
      quote:
        "Some days the plaques are quiet. The fear that someone will stare is not."
    }
  ];

  var quoteEl = document.createElement("p");
  quoteEl.className = "fg-star-quote fg-star-quote--left";
  quoteEl.id = "fg-star-quote";
  map.appendChild(quoteEl);

  var hideTimer = null;

  function hideQuote() {
    quoteEl.classList.remove("is-visible");
    quoteEl.textContent = "";
  }

  var quoteSlots = ["left", "right", "top-right", "bottom-left"];

  function showQuote(text) {
    var slot = quoteSlots[Math.floor(Math.random() * quoteSlots.length)];
    quoteEl.classList.remove("is-visible");
    quoteEl.classList.remove(
      "fg-star-quote--left",
      "fg-star-quote--right",
      "fg-star-quote--top-right",
      "fg-star-quote--bottom-left"
    );
    quoteEl.classList.add("fg-star-quote--" + slot);
    quoteEl.textContent = '"' + text + '"';
    map.classList.add("is-hint-hidden");
    void quoteEl.offsetWidth;
    quoteEl.classList.add("is-visible");
    clearTimeout(hideTimer);
    hideTimer = window.setTimeout(hideQuote, 5000);
  }

  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i];
    var star = document.createElement("button");
    star.type = "button";
    star.className = "fg-star-node";
    star.style.left = (node.x / DESIGN_W) * 100 + "%";
    star.style.top = (node.y / DESIGN_H) * 100 + "%";
    star.style.animationDelay = (i % 8) * 0.22 + "s";
    star.setAttribute("aria-label", "Patient voice " + (i + 1));
    star.dataset.quote = node.quote;

    star.addEventListener("mouseenter", function () {
      showQuote(this.dataset.quote);
    });
    star.addEventListener("focus", function () {
      showQuote(this.dataset.quote);
    });

    layer.appendChild(star);
  }
})();
