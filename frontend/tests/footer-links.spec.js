import {test, expect} from '@playwright/test';

test('staff can publish a footer button and hide it without losing its address', async ({page}) => {
  await page.goto('/admin');
  await page.getByLabel('Username').fill('admin');
  await page.getByLabel('Password').fill('admin123');
  await page.getByRole('button',{name:'Sign in'}).click();
  await page.locator('aside').getByRole('link',{name:'Site settings'}).click();
  const old=await (await page.request.get('/api/v1/admin/settings')).json();
  const session=await (await page.request.get('/api/v1/admin/auth/me')).json();
  const channels=[['GitHub','https://github.com/example'],['WhatsApp','https://wa.me/123456789'],['Discord','https://discord.gg/example'],['Website','https://example.org/']];
  try {
    for(const [name,url] of channels){await page.getByLabel(name+' URL',{exact:true}).fill(url);await page.getByRole('switch',{name:'Show '+name+' in footer'}).check();}
    await page.getByRole('button',{name:'Save settings'}).click();
    await expect(page.getByRole('status')).toHaveText('Settings saved.');
    await page.goto('/about');
    for(const [name,url] of channels) await expect(page.locator('footer').getByRole('link',{name,exact:true})).toHaveAttribute('href',url);
    await page.goto('/admin/settings');
    await page.getByRole('switch',{name:'Show Discord in footer'}).uncheck();
    await page.getByRole('button',{name:'Save settings'}).click();
    await expect(page.getByRole('status')).toHaveText('Settings saved.');
    await page.reload();
    await expect(page.getByLabel('Discord URL',{exact:true})).toHaveValue(channels[2][1]);
    await expect(page.getByRole('switch',{name:'Show Discord in footer'})).not.toBeChecked();
    await page.goto('/');await expect(page.locator('footer').getByRole('link',{name:'GitHub',exact:true})).toBeVisible();
    await expect(page.locator('footer').getByRole('link',{name:'Discord',exact:true})).toHaveCount(0);
  } finally {
    const result=await page.request.put('/api/v1/admin/settings',{headers:{'X-CSRF-Token':session.csrf},data:{footer_text:old.footer_text || '',footer_links:old.footer_links}});
    expect(result.ok()).toBeTruthy();
  }
});
