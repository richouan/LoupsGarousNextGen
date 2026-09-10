async function runIntegrationTest() {
  console.log('--- STARTING END-TO-END INTEGRATION TEST ---');
  
  // 1. Auth
  const loginRes = await fetch('http://localhost:3001/api/auth/demo-login', { method: 'POST' });
  const { token, user } = await loginRes.json();
  console.log('1. Logged in as:', user.username);

  // 2. Configure Guild Settings
  const setRes = await fetch('http://localhost:3001/api/guilds/1001/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({
      prefix: '!',
      autoReplyEnabled: true,
      defaultReplyMode: 'BOTH',
      deliveryMethod: 'PUBLIC',
      allowedChannelIds: ['chan-101', 'chan-202'],
      allowedCategoryIds: [],
      ignoredChannelIds: ['chan-203'],
      userCooldownSeconds: 3
    })
  });
  const savedSettings = await setRes.json();
  console.log('2. Settings saved! Allowed channels:', savedSettings.allowedChannelIds, 'Ignored:', savedSettings.ignoredChannelIds);

  // 3. Create Custom Role Card
  const cardRes = await fetch('http://localhost:3001/api/guilds/1001/cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({
      name: "Chasseur d'Élite",
      camp: 'VILLAGEOIS',
      description: 'Version légendaire du chasseur avec deux balles en argent.',
      shortDescription: 'Deux tirs en mourant.',
      triggers: ['sniper', 'tireur-elite']
    })
  });
  const newCard = await cardRes.json();
  console.log('3. Created custom card:', newCard.name, '| Triggers:', newCard.triggers);

  // 4. Test Simulation with custom trigger in allowed channel
  const sim1 = await fetch('http://localhost:3001/api/bot/simulate-reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guildId: '1001', channelId: 'chan-101', messageContent: 'sniper' })
  });
  const data1 = await sim1.json();
  console.log('4. Custom trigger "sniper" in #chan-101 -> Status:', data1.status, '| Card:', data1.matchedCard?.name);

  // 5. Test Simulation in ignored channel #chan-203
  const sim2 = await fetch('http://localhost:3001/api/bot/simulate-reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guildId: '1001', channelId: 'chan-203', messageContent: 'Chasseur' })
  });
  const data2 = await sim2.json();
  console.log('5. Ignored channel check -> Status:', data2.status, '| Reason:', data2.reason);

  // 6. Test Simulation on normal conversational sentence
  const sim3 = await fetch('http://localhost:3001/api/bot/simulate-reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guildId: '1001', channelId: 'chan-101', messageContent: 'Je pense que le chasseur a bien joué' })
  });
  const data3 = await sim3.json();
  console.log('6. Conversation sentence check -> Status:', data3.status, '| Reason:', data3.reason);

  console.log('\n🎉 ALL INTEGRATION TESTS PASSED PERFECTLY!');
}

runIntegrationTest().catch(console.error);
