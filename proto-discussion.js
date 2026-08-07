/* ============================================================
   Prototype · inline discussion
   ------------------------------------------------------------
   A second presentation over the comment layer's data, for pages that are
   documents rather than screens: the changelog and the use cases. There, a
   reviewer's opinion is about an *entry* — this use case, that round — and not
   about a point on a picture, so the thread belongs under the entry where it is
   read, the way an issue tracker shows it. No pins, no pointing, no popover.

   It owns no store, no auth and no configuration. Everything it writes goes
   through protoComments' own seam (`threadsAt`, `loadDetail`, `startThread`,
   `replyTo`, `resolveThread`), so one prototype has exactly one comment
   backend, one signed-in reviewer, and one set of threads — the same ones the
   overview lists and the same ones a `#c=` deep link opens.

   Mount it on elements carrying `data-c`. That attribute is the entry's
   identity and must come from the data (a commit, a declared id), never from
   the entry's position: both of these pages are regenerated, and a positional
   anchor is a comment with an expiry date.

     protoComments.init({ overview: true }).then(function (layer) {
       if (layer) protoDiscussion.mount(layer);
     });

   `overview: true` because this page draws no pins; the flag stops the layer
   building pin chrome it would never use.
   ============================================================ */
(function (global) {
  'use strict';

  var document = global.document;
  var activeMounts = new WeakMap();

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = String(text);
    return node;
  }

  function personLabel(person) {
    if (!person) return 'Reviewer';
    return person.name || person.email || person.uid || 'Reviewer';
  }

  function when(value) {
    var date = new Date(value);
    return isNaN(date.getTime()) ? String(value || '') : date.toLocaleString();
  }

  function message(entry) {
    var wrap = el('article', 'pd-msg');
    var head = el('p', 'pd-who');
    head.appendChild(el('strong', '', personLabel(entry.author)));
    head.appendChild(document.createTextNode(' · ' + when(entry.createdAt)));
    wrap.appendChild(head);
    wrap.appendChild(el('p', 'pd-body', entry.body));
    return wrap;
  }

  /* One mounted discussion: the section under one entry, and everything it
     knows about that entry. Kept as a closure per element rather than as a
     lookup keyed by selector, because the element is what the caller has and
     what re-render replaces. */
  function attach(layer, element, state) {
    var section = el('section', 'pd');
    var head = el('div', 'pd-head');
    var count = el('span', 'pd-count');
    head.appendChild(count);
    section.appendChild(head);
    var list = el('div', 'pd-list');
    section.appendChild(list);
    var foot = el('div', 'pd-foot');
    section.appendChild(foot);
    element.appendChild(section);

    function composer(thread) {
      var form = el('form', 'pd-form');
      var box = el('textarea', 'pd-input');
      box.rows = 2;
      box.placeholder = thread ? 'Reply…' : 'Add a comment…';
      var send = el('button', 'pd-send', thread ? 'Reply' : 'Comment');
      send.type = 'submit';
      form.appendChild(box);
      form.appendChild(send);
      form.onsubmit = function (event) {
        event.preventDefault();
        var body = String(box.value || '').trim();
        if (!body) return;
        send.disabled = true;
        var written = thread ? layer.replyTo(thread, body) : layer.startThread(element, body);
        written
          .then(function () {
            box.value = '';
            // The subscription redraws this section when the write comes back,
            // so nothing is appended optimistically: a comment a reviewer can
            // see but the store never took is worse than a slow one.
          })
          .catch(function (error) {
            state.fail(section, 'That comment was not saved. Check reviewer access and try again.', error);
          })
          .finally(function () {
            send.disabled = false;
          });
      };
      return form;
    }

    function render() {
      var threads = layer.threadsAt(element);
      var open = threads.filter(function (thread) {
        return thread.status !== 'resolved';
      });
      count.textContent = threads.length
        ? open.length + ' open · ' + (threads.length - open.length) + ' resolved'
        : 'No comments yet';
      section.classList.toggle('pd-empty', threads.length === 0);

      list.replaceChildren();
      threads.forEach(function (thread) {
        var deleting = thread.status === 'deleting';
        var item = el(
          'div',
          'pd-thread' + (thread.status === 'resolved' ? ' pd-done' : '') + (deleting ? ' pd-deleting' : '')
        );
        item.id = 'c-' + thread.id;
        if (Array.isArray(thread.messages)) {
          thread.messages.forEach(function (entry) {
            item.appendChild(message(entry));
          });
        } else {
          item.appendChild(el('p', 'pd-body pd-loading', 'Loading…'));
          state.hydrate(thread);
        }
        if (deleting) {
          item.appendChild(el('p', 'pd-delete-state', 'Deletion is incomplete. This thread is read-only.'));
        } else if (layer.user) {
          item.appendChild(composer(thread));
          if (thread.status !== 'resolved') {
            var done = el('button', 'pd-resolve', 'Resolve');
            done.type = 'button';
            done.onclick = function () {
              done.disabled = true;
              layer
                .resolveThread(thread)
                .catch(function (error) {
                  state.fail(section, 'That comment could not be resolved.', error);
                })
                .finally(function () {
                  done.disabled = false;
                });
            };
            item.appendChild(done);
          }
        }
        if (typeof layer.canDelete === 'function' && layer.canDelete(thread)) {
          var remove = el('button', 'pd-delete', deleting ? 'Retry deletion' : 'Delete thread');
          remove.type = 'button';
          remove.onclick = function () {
            remove.disabled = true;
            Promise.resolve(layer.deleteThread(thread)).catch(function (error) {
              state.fail(section, 'Deletion did not finish. Retry deletion.', error);
            }).finally(function () {
              remove.disabled = false;
            });
          };
          item.appendChild(remove);
        }
        list.appendChild(item);
      });

      foot.replaceChildren();
      if (layer.user) foot.appendChild(composer(null));
      else foot.appendChild(el('p', 'pd-signin', 'Sign in to comment.'));
    }

    return render;
  }

  function mount(layer, options) {
    if (!layer) return null;
    var previous = activeMounts.get(layer);
    if (previous) previous.destroy();
    var settings = options || {};
    var root = settings.root || document;
    var marked = Array.prototype.slice.call(root.querySelectorAll('[data-c]'));
    if (!marked.length) return null;

    var hydrating = {};
    var state = {
      fail: function (section, sentence, error) {
        var existing = section.querySelector('.pd-error');
        if (existing) existing.remove();
        section.appendChild(el('p', 'pd-error', sentence));
        if (global.console && global.console.error) global.console.error('[proto-discussion] cause:', error);
      },
      hydrate: function (thread) {
        if (hydrating[thread.id]) return;
        hydrating[thread.id] = true;
        layer
          .loadDetail(thread)
          .catch(function (error) {
            // Released, or a thread whose fetch failed once shows "Loading…"
            // for the life of the page and is never asked for again.
            delete hydrating[thread.id];
            if (global.console && global.console.error) global.console.error('[proto-discussion] detail:', error);
          });
      },
    };

    var renderers = marked.map(function (element) {
      return attach(layer, element, state);
    });
    function redraw() {
      renderers.forEach(function (render) {
        render();
      });
    }

    /* The layer announces a delivery and a sign-in through these two, exactly
       as the overview page reads them. Wrapping rather than polling keeps one
       source of truth: what the store says, when it says it. */
    var setThreads = layer.setThreads.bind(layer);
    layer.setThreads = function (threads, merge) {
      setThreads(threads, merge);
      redraw();
    };
    var setUser = layer.setUser.bind(layer);
    layer.setUser = function (user) {
      setUser(user);
      redraw();
    };

    var stopCapabilities = typeof layer.onCapabilitiesChanged === 'function'
      ? layer.onCapabilitiesChanged(redraw)
      : function () {};
    var destroyed = false;
    function destroy() {
      if (destroyed) return;
      destroyed = true;
      stopCapabilities();
      if (activeMounts.get(layer) === mounted) activeMounts.delete(layer);
    }
    var mounted = { destroy: destroy, redraw: redraw };
    activeMounts.set(layer, mounted);
    if (typeof global.addEventListener === 'function') {
      global.addEventListener('pagehide', destroy, { once: true });
    }

    redraw();
    return mounted;
  }

  global.protoDiscussion = { mount: mount };
})(window);
