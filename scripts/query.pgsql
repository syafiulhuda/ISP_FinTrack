with activeCustomer as (
    select
        TO_CHAR("createdAt"::date, 'YYYY-MM') as month,
        count(*) as tot_cust
    from customers c
    group by 1
)
, inactiveCustomer as (
    select
        TO_CHAR("createdAt"::date, 'YYYY-MM') as month,
        count(*) as inactive_cust
    from customers c
    where status = 'Inactive'
    group by 1
)
select
    COALESCE(a.month, i.month) as "Month",
    sum(coalesce(a.tot_cust,0)) - sum(coalesce(i.inactive_cust,0)) as "Growth"
from activeCustomer a
full outer join inactiveCustomer i on a.month = i.month
group by a.month, i.month
order by "Month" ASC
