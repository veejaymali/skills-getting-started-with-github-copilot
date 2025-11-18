document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper to escape HTML in participant strings
  function escapeHtml(str) {
    return String(str).replace(/[&<>"'`=\/]/g, (s) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;', '=': '&#61;', '/': '&#47;' }[s])
    );
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and reset activity select
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants HTML: list with delete buttons or a muted "no participants" message
        const participantsHtml =
          details.participants && details.participants.length
            ? `<div class="participants-section" aria-live="polite">
                 <h5>Participants</h5>
                 <ul class="participants-list">
                   ${details.participants
                     .map(
                       (p) =>
                         `<li>${escapeHtml(p)} <button class="delete-participant" data-activity="${escapeHtml(
                           name
                         )}" data-email="${escapeHtml(p)}" aria-label="Remove participant">✖</button></li>`
                     )
                     .join("")}
                 </ul>
               </div>`
            : `<div class="participants-section none" aria-live="polite">
                 <h5>Participants</h5>
                 <p class="muted">No participants yet</p>
               </div>`;

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHtml}
        `;

        activitiesList.appendChild(activityCard);

        // Attach delete handlers for participant removal
        activityCard.querySelectorAll(".delete-participant").forEach((btn) => {
          btn.addEventListener("click", async (e) => {
            const activityName = btn.dataset.activity;
            const email = btn.dataset.email;

            if (!activityName || !email) return;

            // Confirm removal
            const ok = confirm(`Remove ${email} from ${activityName}?`);
            if (!ok) return;

            try {
              const resp = await fetch(
                `/activities/${encodeURIComponent(activityName)}/participant?email=${encodeURIComponent(email)}`,
                { method: "DELETE" }
              );

              const result = await resp.json();

              if (resp.ok) {
                messageDiv.textContent = result.message || "Participant removed";
                messageDiv.className = "success";
                messageDiv.classList.remove("hidden");
                // Refresh activities list
                fetchActivities();
              } else {
                messageDiv.textContent = result.detail || "Failed to remove participant";
                messageDiv.className = "error";
                messageDiv.classList.remove("hidden");
              }

              setTimeout(() => messageDiv.classList.add("hidden"), 5000);
            } catch (err) {
              console.error("Error removing participant:", err);
              messageDiv.textContent = "Failed to remove participant. Please try again.";
              messageDiv.className = "error";
              messageDiv.classList.remove("hidden");
            }
          });
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities so new participant appears immediately
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
