-- Rode no SQL Editor do Supabase (Dashboard → SQL → New query).
-- Atualizado para limpar também a tabela stock_movements.

create or replace function public.delete_product(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sales_count integer;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado.';
  end if;

  if not exists (
    select 1
    from public.products
    where id = p_product_id
      and user_id = auth.uid()
  ) then
    raise exception 'Produto não encontrado.';
  end if;

  select count(*)::integer
  into v_sales_count
  from public.sales
  where product_id = p_product_id;

  if v_sales_count > 0 then
    raise exception
      'Este produto possui vendas. Exclua as vendas antes de apagar o produto.';
  end if;

  if to_regclass('public.stock_movements') is not null then
    delete from public.stock_movements
    where product_id = p_product_id
       or purchase_id in (
            select id from public.purchases where product_id = p_product_id
          );
  end if;

  if to_regclass('public.purchase_installments') is not null then
    delete from public.purchase_installments
    where purchase_id in (
      select id from public.purchases where product_id = p_product_id
    );
  end if;

  if to_regclass('public.purchase_payments') is not null then
    delete from public.purchase_payments
    where purchase_id in (
      select id from public.purchases where product_id = p_product_id
    );
  end if;

  delete from public.purchases
  where product_id = p_product_id;

  delete from public.products
  where id = p_product_id
    and user_id = auth.uid();
end;
$$;

create or replace function public.delete_sale(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product_id uuid;
  v_quantity integer;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado.';
  end if;

  select s.product_id, s.quantity
  into v_product_id, v_quantity
  from public.sales s
  join public.products p on p.id = s.product_id
  where s.id = p_sale_id
    and p.user_id = auth.uid();

  if v_product_id is null then
    raise exception 'Venda não encontrada.';
  end if;

  if to_regclass('public.stock_movements') is not null then
    delete from public.stock_movements
    where sale_id = p_sale_id;
  end if;

  delete from public.sale_payments
  where sale_id = p_sale_id;

  delete from public.sale_installments
  where sale_id = p_sale_id;

  delete from public.sales
  where id = p_sale_id;

  update public.products
  set
    quantity = quantity + v_quantity,
    status = case
      when quantity + v_quantity > 0 and status = 'sold' then 'in_stock'
      else status
    end,
    updated_at = now()
  where id = v_product_id
    and user_id = auth.uid();
end;
$$;

grant execute on function public.delete_product(uuid) to authenticated;
grant execute on function public.delete_sale(uuid) to authenticated;
